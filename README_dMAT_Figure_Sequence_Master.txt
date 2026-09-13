# dMAT Figure Sequence — Master Practice Simulator

This is a procedural practice generator inspired by the transformation patterns in the official dMAT Figure Sequence preparation examples supplied by the user. It is NOT an official dMAT product and does not reproduce the proprietary exam generator.

## Requirements
- Python 3.9+
- Pillow: `pip install pillow`
- Tkinter (normally included with standard Python on Windows/macOS; Linux may require the OS tkinter package)

## Start the simulator
```bash
python dmat_figure_sequence_master.py --gui
```

## Generate PNG questions
```bash
python dmat_figure_sequence_master.py --export 25 --difficulty high
```
Generated images and answer manifests are placed in `dmat_generated/`.

## Import as a Python module
```python
import dmat_figure_sequence_master as d
q = d.generate_question("high")
print(q["answer_1"], q["answer_2"])
```

## Difficulty
- Low: one symbol and a simple movement/transformation
- Medium: multiple symbols with independent rules
- High: composite movement, bouncing, rotation and colour rules
- Random: weighted mixture of all three

## Simulator features
- 4x4 grids
- 4 given figures + 2 missing figures
- 6 answer choices per missing figure
- Plausible distractors
- Randomized question seeds
- Score, accuracy, streak and response time
- Rule breakdown after submission
- Unlimited procedural generation
- PNG and JSON export

## Important preparation note
Use this as a training aid, not as an exact predictor of the real dMAT. The generator is designed from the patterns visible in the supplied official preparation examples and deliberately expands them into a much larger practice space.
