from typing import List, Dict, Any
import os

class LanguageModel:
    def __init__(self):
        pass

    def generate(self, messages: List[Dict[str, Any]]) -> str:
        raise NotImplementedError("Subclasses must implement this method")


class BedrockLanguageModel(LanguageModel):
    def __init__(self, model_name: str = "us.anthropic.claude-sonnet-4-6", api_key: str = None):
        super().__init__()
        self.model_name = model_name
        self.temperature = 0.0
        self.max_tokens = 8000

        self.api_key = api_key or os.getenv("AWS_BEARER_TOKEN_BEDROCK")
        if not self.api_key:
            raise ValueError("AWS_BEARER_TOKEN_BEDROCK environment variable not set")

        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            raise ImportError("boto3 package not installed. Install with: pip install boto3")
        os.environ["AWS_BEARER_TOKEN_BEDROCK"] = self.api_key
        self.client = boto3.client(
            "bedrock-runtime", region_name="us-east-1", config=Config(read_timeout=300)
        )

    def generate(self, messages: List[Dict[str, Any]]) -> str:
        system = []
        bedrock_messages = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            if role == "system":
                system.append({"text": content})
                continue
            if role == "tool":
                role = "user"
                content = f"Tool result: {content}"
            if role not in ("user", "assistant"):
                continue
            block = {"text": content}
            if bedrock_messages and bedrock_messages[-1]["role"] == role:
                bedrock_messages[-1]["content"].append(block)
            else:
                bedrock_messages.append({"role": role, "content": [block]})

        # Sonnet requires a user turn after a reasoning-only assistant response.
        if bedrock_messages and bedrock_messages[-1]["role"] == "assistant":
            bedrock_messages.append({"role": "user", "content": [{"text":
                "Continue."
            }]})

        try:
            request = {
                "modelId": self.model_name,
                "messages": bedrock_messages,
                "inferenceConfig": {
                    "temperature": self.temperature,
                    "maxTokens": self.max_tokens,
                },
            }
            if system:
                request["system"] = system
            response = self.client.converse(**request)
            return "".join(
                block["text"] for block in response["output"]["message"]["content"]
                if "text" in block
            )
        except Exception as e:
            raise RuntimeError(f"Bedrock API error: {str(e)}")


class MockLanguageModel(LanguageModel):
    def __init__(self, responses: List[str] = None):
        super().__init__()
        self.responses = responses or [
            '<tool_call>{"tool": "fs.read", "arguments": {"path": "package.json"}}</tool_call>',
            'Let me check the project structure.',
            '<tool_call>{"tool": "tests.run", "arguments": {"type": "all"}}</tool_call>',
            '<terminate>'
        ]
        self.call_count = 0

    def generate(self, messages: List[Dict[str, Any]]) -> str:
        response = self.responses[self.call_count % len(self.responses)]
        self.call_count += 1
        return response

    def reset(self):
        self.call_count = 0


def create_language_model(config: Dict[str, Any]) -> LanguageModel:
    llm_type = config.get("llm_type", "mock")

    if llm_type == "bedrock":
        model_name = config.get("model", "us.anthropic.claude-sonnet-4-6")
        api_key = config.get("api_key", os.getenv("AWS_BEARER_TOKEN_BEDROCK"))
        return BedrockLanguageModel(model_name=model_name, api_key=api_key)
    elif llm_type == "mock":
        responses = config.get("mock_responses")
        return MockLanguageModel(responses=responses)
    else:
        raise ValueError(f"Unknown llm_type: {llm_type}. Use 'bedrock' or 'mock'.")
