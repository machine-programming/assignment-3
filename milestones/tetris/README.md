# Tetris milestones

Milestone 1 is already in `targets/tetris/`. This folder holds Milestones 2 and 3, which the agent can't see until you copy them in. Release each one when you reach it, once only, from the assignment root.

Milestone 2:

```bash
cp -r milestones/tetris/m2_rules/tests targets/tetris/tests/m2_rules
cat milestones/tetris/m2_rules/INTERFACE.md >> targets/tetris/.waa/instruction.md
```

Milestone 3:

```bash
cp -r milestones/tetris/m3_leaderboard/tests targets/tetris/tests/m3_leaderboard
cat milestones/tetris/m3_leaderboard/INTERFACE.md >> targets/tetris/.waa/instruction.md
```

After releasing, update **Current Milestone** and **My Variant** in `targets/tetris/.waa/instruction.md`. Part 3 of the README has the full steps.
