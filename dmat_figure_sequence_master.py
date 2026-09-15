
# dMAT FIGURE SEQUENCE — ULTIMATE PRACTICE ENGINE
# Procedural, unlimited, 4x4-grid practice inspired by the supplied official examples.
# Not an official dMAT product or exact replica.

import random, math, os, json, time
from dataclasses import dataclass, replace
from typing import List, Tuple, Dict, Callable, Optional
from PIL import Image, ImageDraw, ImageFont

GRID = 4
CELL = 54
PAD = 12
BOARD = GRID * CELL
BG = "white"
LINE = "black"

COLORS = {
    "yellow": "#FFD83D",
    "green": "#16B98E",
    "orange": "#F28C28",
    "pink": "#D66BAA",
    "black": "#111111",
    "white": "#FFFFFF",
}

SHAPES = ["square", "triangle", "diamond", "hexagon", "arrow", "corner", "arc"]

@dataclass(frozen=True)
class Symbol:
    shape: str
    r: int
    c: int
    orientation: int = 0
    color: str = "black"
    filled: bool = True

@dataclass(frozen=True)
class State:
    symbols: Tuple[Symbol, ...]

# ------------------ geometry helpers ------------------

def perimeter_cells(n=GRID):
    cells = []
    # top: left -> right
    for c in range(n):
        cells.append((0, c))
    # right: top -> bottom, excluding corner already used
    for r in range(1, n):
        cells.append((r, n-1))
    # bottom: right -> left, excluding corner already used
    for c in range(n-2, -1, -1):
        cells.append((n-1, c))
    # left: bottom -> top, excluding both corners already used
    for r in range(n-2, 0, -1):
        cells.append((r, 0))
    return cells

PERIM = perimeter_cells()

def move_bounce(r, c, dr, dc, n=GRID):
    nr, nc = r + dr, c + dc
    if nr < 0 or nr >= n:
        dr = -dr
        nr = r + dr
    if nc < 0 or nc >= n:
        dc = -dc
        nc = c + dc
    return nr, nc, dr, dc

def rotate_orientation(o, delta):
    return (o + delta) % 4

# ------------------ drawing ------------------

def cell_center(r, c, cell=CELL):
    return c * cell + cell // 2, r * cell + cell // 2

def polygon(draw, pts, fill, outline=LINE, width=2):
    draw.polygon(pts, fill=fill, outline=outline)
    if width > 1:
        # PIL outline width is available in modern versions
        draw.line(pts + [pts[0]], fill=outline, width=width)

def draw_symbol(draw, s: Symbol, cell=CELL):
    x, y = cell_center(s.r, s.c, cell)
    q = cell * 0.28
    fill = COLORS.get(s.color, s.color)
    outline = LINE

    if s.shape == "square":
        box = [x-q, y-q, x+q, y+q]
        draw.rectangle(box, fill=fill if s.filled else BG, outline=outline, width=2)

    elif s.shape == "diamond":
        pts = [(x, y-q), (x+q, y), (x, y+q), (x-q, y)]
        polygon(draw, pts, fill if s.filled else BG, outline)

    elif s.shape == "triangle":
        # orientation 0 = up
        ang = math.radians(90 - s.orientation * 90)
        pts = []
        for k in range(3):
            a = ang + k * 2*math.pi/3
            pts.append((x + q*math.cos(a), y - q*math.sin(a)))
        polygon(draw, pts, fill if s.filled else BG, outline)

    elif s.shape == "hexagon":
        pts = []
        for k in range(6):
            a = math.radians(30 + k*60)
            pts.append((x + q*math.cos(a), y + q*math.sin(a)))
        polygon(draw, pts, fill if s.filled else BG, outline)

    elif s.shape == "arrow":
        # orientation 0 right, then clockwise
        ang = s.orientation * math.pi/2
        base = [(-0.55,-0.30),(0.05,-0.30),(0.05,-0.55),(0.65,0),
                (0.05,0.55),(0.05,0.30),(-0.55,0.30)]
        pts=[]
        ca, sa = math.cos(ang), math.sin(ang)
        for px, py in base:
            xx, yy = px*q*1.45, py*q*1.45
            pts.append((x + xx*ca - yy*sa, y + xx*sa + yy*ca))
        polygon(draw, pts, fill if s.filled else BG, outline)

    elif s.shape == "corner":
        # L/corner mark
        ang = s.orientation * math.pi/2
        seg = q*1.1
        pts = [(-seg,-seg),(seg,-seg),(seg,-seg+q*0.12),( -seg+q*0.12,-seg+q*0.12),
               (-seg+q*0.12,seg),(-seg,seg)]
        ca, sa = math.cos(ang), math.sin(ang)
        rot=[]
        for px, py in pts:
            rot.append((x + px*ca - py*sa, y + px*sa + py*ca))
        draw.line(rot + [rot[0]], fill=outline, width=3)
        if s.filled:
            # small colored triangle-like fill in corner
            draw.polygon([rot[3], rot[4], rot[5]], fill=fill)

    elif s.shape == "arc":
        box = [x-q, y-q, x+q, y+q]
        start = 180 + s.orientation*90
        draw.arc(box, start=start, end=start+180, fill=fill, width=4)

def render_state(state: State, scale=1):
    size = BOARD
    im = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(im)
    for i in range(GRID+1):
        x = i*CELL
        d.line((x,0,x,size), fill=LINE, width=2)
        d.line((0,x,size,x), fill=LINE, width=2)
    for s in state.symbols:
        draw_symbol(d, s)
    return im

def render_option_grid(states, cols=2, label=True):
    margin = 16
    label_h = 24 if label else 0
    w = cols*(BOARD+margin)+margin
    rows = math.ceil(len(states)/cols)
    h = rows*(BOARD+label_h+margin)+margin
    out = Image.new("RGB",(w,h),BG)
    d = ImageDraw.Draw(out)
    for i, st in enumerate(states):
        rr, cc = divmod(i, cols)
        x = margin + cc*(BOARD+margin)
        y = margin + rr*(BOARD+label_h+margin)
        out.paste(render_state(st),(x,y+label_h))
        if label:
            d.text((x+4,y+2), str(i+1), fill=LINE)
    return out

# ------------------ rule engine ------------------

class Rule:
    name = "base"
    def step(self, state: State) -> State:
        raise NotImplementedError

class DiagonalBounce(Rule):
    name = "diagonal_bounce"
    def __init__(self, dr=1, dc=1):
        self.dr, self.dc = dr, dc
    def step(self, state):
        s = state.symbols[0]
        nr,nc,ndr,ndc = move_bounce(s.r,s.c,self.dr,self.dc)
        ns = replace(s,r=nr,c=nc)
        self.dr,self.dc = ndr,ndc
        return State((ns,))

class BorderWalker(Rule):
    def __init__(self, direction=1, step_size=1):
        self.direction = direction
        self.step_size = step_size
        self.idx = None
    def step(self,state):
        s=state.symbols[0]
        if self.idx is None:
            self.idx=PERIM.index((s.r,s.c))
        self.idx=(self.idx+self.direction*self.step_size)%len(PERIM)
        r,c=PERIM[self.idx]
        return State((replace(s,r=r,c=c),))

class LineBounce(Rule):
    def __init__(self, axis="h", step=1):
        self.axis,self.step_size=axis,step
        self.dir=1
    def step(self,state):
        s=state.symbols[0]
        r,c=s.r,s.c
        if self.axis=="h":
            nc=c+self.dir*self.step_size
            if nc<0 or nc>=GRID:
                self.dir*=-1
                nc=c+self.dir*self.step_size
            c=nc
        else:
            nr=r+self.dir*self.step_size
            if nr<0 or nr>=GRID:
                self.dir*=-1
                nr=r+self.dir*self.step_size
            r=nr
        return State((replace(s,r=r,c=c),))

class RotationOnlyRule(Rule):
    """Rotate a stationary directional symbol by 90 degrees each frame."""
    def __init__(self, delta=1):
        self.delta = delta
    def step(self, state):
        return State(tuple(replace(s, orientation=(s.orientation+self.delta)%4)
                           for s in state.symbols))

class RotatingBorderWalker(Rule):
    def __init__(self, direction=1, step=1, rot=1, colors=None):
        self.direction=direction; self.step_size=step; self.rot=rot
        self.idx=None
        self.t=0
        self.colors=colors
    def step(self,state):
        s=state.symbols[0]
        if self.idx is None: self.idx=PERIM.index((s.r,s.c))
        self.idx=(self.idx+self.direction*self.step_size)%len(PERIM)
        self.t+=1
        r,c=PERIM[self.idx]
        color=s.color
        if self.colors: color=self.colors[self.t%len(self.colors)]
        return State((replace(s,r=r,c=c,orientation=(s.orientation+self.rot)%4,color=color),))

class DiagonalMulti(Rule):
    def __init__(self, symbols):
        self.symbols=list(symbols)
        self.vel=[(1,1),(-1,1),(1,-1),(-1,-1)][:len(symbols)]
    def step(self,state):
        out=[]
        for s,(dr,dc) in zip(state.symbols,self.vel):
            nr,nc,ndr,ndc=move_bounce(s.r,s.c,dr,dc)
            out.append(replace(s,r=nr,c=nc))
        self.vel=[move_bounce(s.r,s.c,*v)[2:] for s,v in zip(state.symbols,self.vel)]
        return State(tuple(out))

class MultiRule(Rule):
    def __init__(self, funcs):
        self.funcs=funcs
    def step(self,state):
        out=[]
        for s,f in zip(state.symbols,self.funcs):
            out.append(f(s))
        return State(tuple(out))


# ------------------ intelligent distractors ------------------

def _mutate_symbol(s: Symbol, kind: str) -> Symbol:
    ns = s
    if kind == "position":
        choices=[(r,c) for r in range(GRID) for c in range(GRID)
                 if (r,c)!=(s.r,s.c)]
        r,c=random.choice(choices)
        return replace(ns,r=r,c=c)
    if kind == "orientation":
        return replace(ns, orientation=(s.orientation+random.choice([1,2,3]))%4)
    if kind == "colour":
        return replace(ns, color=rand_color(s.color))
    if kind == "fill":
        return replace(ns, filled=not s.filled)
    if kind == "shape":
        choices=[x for x in SHAPES if x!=s.shape]
        return replace(ns, shape=random.choice(choices))
    if kind == "one_step":
        dirs=[(-1,0),(1,0),(0,-1),(0,1)]
        random.shuffle(dirs)
        for dr,dc in dirs:
            if 0<=s.r+dr<GRID and 0<=s.c+dc<GRID:
                return replace(ns,r=s.r+dr,c=s.c+dc)
    return ns

def make_distractors(correct: State, difficulty="random") -> List[State]:
    """Create four plausible options with exactly one copy of the correct state."""
    if difficulty == "low":
        mutation_pool=["position","position","one_step","orientation","colour","fill"]
    elif difficulty == "medium":
        mutation_pool=["position","one_step","orientation","colour","fill","shape"]
    else:
        mutation_pool=["one_step","orientation","colour","fill","shape","position",
                       "position","orientation"]

    options=[]
    seen={str(correct)}
    attempts=0
    while len(options)<3 and attempts<1000:
        attempts+=1
        mut=random.choice(mutation_pool)
        syms=list(correct.symbols)
        if not syms:
            continue
        # High-difficulty distractors may contain a two-attribute error.
        if difficulty == "high" and random.random()<0.35:
            indexes=random.sample(range(len(syms)), min(2,len(syms)))
            for idx in indexes:
                syms[idx]=_mutate_symbol(syms[idx], random.choice(
                    ["position","orientation","colour","fill"]))
        else:
            idx=random.randrange(len(syms))
            syms[idx]=_mutate_symbol(syms[idx], mut)
        candidate=State(tuple(syms))
        if valid_state(candidate) and str(candidate) not in seen:
            seen.add(str(candidate))
            options.append(candidate)

    # Deterministic fallback guarantees four options (3 distractors + 1 correct).
    fallback_types=["position","orientation","colour","fill","shape"]
    k=0
    while len(options)<3:
        syms=list(correct.symbols)
        idx=k%max(1,len(syms))
        if syms:
            syms[idx]=_mutate_symbol(syms[idx],fallback_types[k%len(fallback_types)])
        candidate=State(tuple(syms))
        k+=1
        if valid_state(candidate) and str(candidate) not in seen:
            seen.add(str(candidate)); options.append(candidate)
        if k>100:
            break

    all_options=options+[correct]
    random.shuffle(all_options)
    return all_options

# ------------------ generators ------------------

def rand_color(exclude=None):
    vals=["yellow","green","orange","pink","black","white"]
    if exclude in vals and len(vals)>1:
        vals.remove(exclude)
    return random.choice(vals)

def unique_positions(k):
    cells=random.sample([(r,c) for r in range(GRID) for c in range(GRID)],k)
    return cells

def make_low():
    """Generate a one-symbol low-difficulty rule.

    The official examples show simple movement patterns at low difficulty.
    We deliberately vary the movement family so practice does not become
    memorization of one template.
    """
    modes = ["diag", "perim", "h", "v", "rotate"]
    mode = random.choice(modes)
    shape = random.choice(["diamond", "square", "triangle", "circle"])
    color = random.choice(["green", "yellow", "orange", "pink"])

    if mode == "diag":
        r=random.randint(0,GRID-1); c=random.randint(0,GRID-1)
        dr=random.choice([-1,1]); dc=random.choice([-1,1])
        return State((Symbol(shape,r,c,0,color,True),)), DiagonalBounce(dr,dc)

    if mode == "perim":
        r,c=random.choice(PERIM)
        return State((Symbol(shape,r,c,0,color,True),)), BorderWalker(
            direction=random.choice([-1,1]), step_size=random.choice([1,2]))

    if mode == "h":
        r=random.randrange(GRID); c=random.randrange(GRID)
        return State((Symbol(shape,r,c,0,color,True),)), LineBounce("h",1)

    if mode == "v":
        r=random.randrange(GRID); c=random.randrange(GRID)
        return State((Symbol(shape,r,c,0,color,True),)), LineBounce("v",1)

    # Simple orientation cycle with stationary position.
    r=random.randrange(GRID); c=random.randrange(GRID)
    return State((Symbol(random.choice(["triangle","arrow","corner","arc"]),
                         r,c,random.randrange(4),color,True),)), RotationOnlyRule(
        delta=random.choice([1,3]))


def make_medium():
    # Three moving symbols. Two start on the outer border, one starts inside.
    border_choices = random.sample(PERIM, 2)
    interior = random.choice([(r, c) for r in range(1, GRID-1) for c in range(1, GRID-1)
                               if (r, c) not in border_choices])
    positions = [border_choices[0], interior, border_choices[1]]

    specs=[
        Symbol(random.choice(["arrow","diamond"]), *positions[0],
               random.randrange(4), random.choice(["black","pink"]), True),
        Symbol(random.choice(["corner","arc"]), *positions[1],
               random.randrange(4), "white", False),
        Symbol(random.choice(["hexagon","diamond"]), *positions[2],
               0, "yellow", True)
    ]

    # Inspired by the official medium examples:
    #   symbol 1: perimeter walker, usually two cells at a time
    #   symbol 2: rotates 90° each frame
    #   symbol 3: perimeter walker in the opposite direction
    f1=BorderWalker(direction=random.choice([-1,1]),step_size=2)
    f2=LineBounce(axis="h",step=0)  # position stays fixed; orientation is changed below
    f3=BorderWalker(direction=random.choice([-1,1]),step_size=1)

    class MediumRule(Rule):
        def __init__(self):
            self.rules=[f1,f2,f3]
            self.t=0
        def step(self,state):
            self.t += 1
            out=[]
            # Border walker + alternating black/pink
            s=state.symbols[0]
            s2=self.rules[0].step(State((s,))).symbols[0]
            s2=replace(s2, color=("black" if self.t % 2 else "pink"))
            out.append(s2)

            # Rotates 90° to the right, stays in place
            s=state.symbols[1]
            out.append(replace(s, orientation=(s.orientation+1)%4))

            # Counter-clockwise border walker
            s=state.symbols[2]
            s3=self.rules[2].step(State((s,))).symbols[0]
            out.append(s3)
            return State(tuple(out))
    return State(tuple(specs)), MediumRule()


def make_high():
    # Four symbols with independent motion/transformation rules.
    # The combination is intentionally richer than the low/medium generators.
    tri_pos = random.choice(PERIM)
    used={tri_pos}
    other_positions=[]
    for pos in random.sample([(r,c) for r in range(GRID) for c in range(GRID)], GRID*GRID):
        if pos not in used:
            other_positions.append(pos)
            used.add(pos)
        if len(other_positions)==3:
            break

    syms=[
        Symbol("arc", *other_positions[0], 0, random.choice(["orange","black"]), True),
        Symbol("corner", *other_positions[1], random.randrange(4),
               random.choice(["white","pink","yellow"]), True),
        Symbol("hexagon", *other_positions[2], 0, "white", False),
        Symbol("triangle", *tri_pos, 0, random.choice(["yellow","green","orange"]), True),
    ]

    class HighRule(Rule):
        def __init__(self, syms):
            self.t=0
            self.tri_idx=PERIM.index((syms[3].r,syms[3].c))
            self.corner_dir=random.choice([-1,1])
            self.hex_v=(random.choice([-1,1]), random.choice([-1,1]))
        def step(self,state):
            self.t+=1
            out=[]

            # 1) Arc: moves down, right, up, left ...; rotates 90° left;
            #    alternates orange/black.
            s=state.symbols[0]
            dirs=[(1,0),(0,1),(-1,0),(0,-1)]
            dr,dc=dirs[(self.t-1)%4]
            nr,nc=s.r+dr,s.c+dc
            if not (0<=nr<GRID and 0<=nc<GRID):
                nr,nc=s.r-dr,s.c-dc
            out.append(replace(s,r=nr,c=nc,
                               orientation=(s.orientation+3)%4,
                               color=("orange" if self.t%2 else "black")))

            # 2) Corner: moves horizontally and bounces; rotates 90° left;
            #    cycles white -> pink -> yellow.
            s=state.symbols[1]
            nc=s.c+self.corner_dir
            if nc<0 or nc>=GRID:
                self.corner_dir*=-1
                nc=s.c+self.corner_dir
            cycle=["white","pink","yellow"]
            out.append(replace(s,c=nc,
                               orientation=(s.orientation+3)%4,
                               color=cycle[self.t%3]))

            # 3) Hexagon: diagonal movement with boundary bouncing.
            s=state.symbols[2]
            nr,nc,dr,dc=move_bounce(s.r,s.c,*self.hex_v)
            self.hex_v=(dr,dc)
            out.append(replace(s,r=nr,c=nc))

            # 4) Triangle: clockwise perimeter movement by two cells;
            #    cycles yellow -> green -> orange.
            s=state.symbols[3]
            self.tri_idx=(self.tri_idx+2)%len(PERIM)
            r,c=PERIM[self.tri_idx]
            cols=["yellow","green","orange"]
            out.append(replace(s,r=r,c=c,color=cols[self.t%3]))
            return State(tuple(out))

    return State(tuple(syms)), HighRule(syms)


def valid_state(state):
    # dMAT-style boards normally keep symbols in separate cells.
    coords=[(s.r,s.c) for s in state.symbols]
    return len(coords)==len(set(coords))

def describe_rule(rule, difficulty="random"):
    """Return human-readable study notes for the generated rule set."""
    name = rule.__class__.__name__
    if name == "DiagonalBounce":
        return ["The symbol moves diagonally and reverses direction when it reaches a border."]
    if name == "BorderWalker":
        direction = "clockwise" if rule.direction > 0 else "counter-clockwise"
        return [f"The symbol moves along the outer border {direction} by {rule.step_size} cell(s) each frame."]
    if name == "LineBounce":
        axis = "horizontally" if rule.axis == "h" else "vertically"
        return [f"The symbol moves {axis} and bounces at the boundary."]
    if name == "RotationOnlyRule":
        direction = "right" if rule.delta > 0 else "left"
        return [f"The symbol stays in place and rotates 90 degrees to the {direction} each frame."]
    if name == "RotatingBorderWalker":
        direction = "clockwise" if rule.direction > 0 else "counter-clockwise"
        return [f"The symbol moves {direction} around the outer border by {rule.step_size} cell(s), rotates each frame, and may cycle colours."]
    if name == "DiagonalMulti":
        return ["Multiple symbols move diagonally with independent directions and bounce at the borders."]
    if name == "MediumRule":
        return [
            "One symbol follows a perimeter movement rule.",
            "One symbol changes orientation by 90 degrees each frame.",
            "One symbol follows an opposite-direction perimeter movement rule."
        ]
    if name == "HighRule":
        return [
            "Symbol 1 combines movement, boundary handling, rotation and alternating colour.",
            "Symbol 2 moves horizontally with bouncing, rotates, and cycles through colours.",
            "Symbol 3 moves diagonally with boundary bouncing.",
            "Symbol 4 moves around the perimeter and changes colour cyclically."
        ]
    return [f"Generated rule type: {name}"]

def generate_question(difficulty="random", seed=None):
    if seed is not None:
        random.seed(seed)

    if difficulty=="random":
        difficulty=random.choices(["low","medium","high"],[0.35,0.4,0.25])[0]

    maker={"low":make_low,"medium":make_medium,"high":make_high}[difficulty]

    # Regenerate if the random rule creates an overlapping figure.
    for _ in range(500):
        initial,rule=maker()
        frames=[initial]
        cur=initial
        good=True
        for _ in range(5):
            cur=rule.step(cur)
            frames.append(cur)
            if not valid_state(cur):
                good=False
                break
        if good:
            break
    else:
        raise RuntimeError("Could not generate a valid non-overlapping question.")

    correct1,correct2=frames[4],frames[5]
    opts1=make_distractors(correct1, difficulty)
    opts2=make_distractors(correct2, difficulty)

    return {
        "difficulty":difficulty,
        "frames":frames,
        "options_1":opts1,
        "options_2":opts2,
        "answer_1":opts1.index(correct1)+1,
        "answer_2":opts2.index(correct2)+1,
        "seed": seed,
        "rules": describe_rule(rule, difficulty),
    }


def print_question(q):
    print(f"\nDifficulty: {q['difficulty'].upper()}")
    print(f"Correct option for missing frame 1: {q['answer_1']}")
    print(f"Correct option for missing frame 2: {q['answer_2']}")
    print("Use save_question() to render the visual question and choices.")



# ------------------ exporting / persistence ------------------

def save_question(q, prefix="dmat_question"):
    """Render a generated question into a PNG contact sheet and return its path."""
    os.makedirs("dmat_generated", exist_ok=True)
    stamp = f"{int(__import__('time').time()*1000)}_{random.randint(1000,9999)}"
    path = os.path.join("dmat_generated", f"{prefix}_{stamp}.png")

    # Layout: four given figures, two missing boxes, then 12 answer choices.
    W = 6*(BOARD+18)+18
    top_h = BOARD+42
    opt_w = 3*(BOARD+18)+18
    opt_h = 2*(BOARD+32)+18
    H = 2*top_h + opt_h + 55
    im = Image.new("RGB", (max(W,opt_w), H), "white")
    d = ImageDraw.Draw(im)
    d.text((18,10), f"dMAT Figure Sequences — {q['difficulty'].upper()}", fill=LINE)

    # Sequence
    for i in range(6):
        x=18+i*(BOARD+18)
        y=42
        if i<4:
            tile=render_state(q['frames'][i])
            im.paste(tile,(x,y))
        else:
            d.rectangle((x,y,x+BOARD,y+BOARD),outline=LINE,width=3)
            d.text((x+BOARD//2-7,y+BOARD//2-12),"?",fill=LINE)
        d.text((x+BOARD//2-4,y+BOARD+7),str(i+1),fill=LINE)

    y0=42+BOARD+45
    for group_idx, options in enumerate([q['options_1'],q['options_2']]):
        gx=18
        gy=y0 + group_idx*(2*(BOARD+32)+18)
        d.text((gx,gy-20),f"Missing Figure {group_idx+5}",fill=LINE)
        for i,st in enumerate(options):
            rr,cc=divmod(i,2)
            x=gx+cc*(BOARD+18)
            y=gy+rr*(BOARD+32)
            im.paste(render_state(st),(x,y))
            d.text((x+BOARD//2-4,y+BOARD+7),str(i+1),fill=LINE)

    im.save(path)
    # Save machine-readable solution beside it.
    with open(path[:-4]+".json","w",encoding="utf-8") as f:
        json.dump({
            "difficulty": q["difficulty"],
            "answer_1": q["answer_1"],
            "answer_2": q["answer_2"],
            "seed": q.get("seed"),
            "rules": q.get("rules", []),
        },f,indent=2)
    return path

# ------------------ interactive practice app ------------------

def launch_gui():
    """Launch the unlimited dMAT practice simulator."""
    import tkinter as tk
    from PIL import ImageTk

    root = tk.Tk()
    root.title("dMAT Figure Sequence — Master Practice Simulator")
    root.geometry("1280x900")
    root.minsize(1050, 760)
    root.configure(bg="white")

    state = {
        "question": None, "choice1": None, "choice2": None,
        "score": 0, "attempts": 0, "streak": 0,
        "started": 0.0, "submitted": False,
        "best_time": None,
    }

    header = tk.Frame(root, bg="white")
    header.pack(fill="x", padx=16, pady=(12, 6))
    tk.Label(header, text="dMAT Figure Sequences", font=("Arial", 21, "bold"),
             bg="white").pack(side="left")
    stats = tk.Label(header, text="0 / 0  •  0%", font=("Arial", 12, "bold"), bg="white")
    stats.pack(side="right")

    controls = tk.Frame(root, bg="white")
    controls.pack(fill="x", padx=16)
    tk.Label(controls, text="Difficulty:", font=("Arial", 11, "bold"), bg="white").pack(side="left")
    diff = tk.StringVar(value="Random")
    tk.OptionMenu(controls, diff, "Random", "Low", "Medium", "High").pack(side="left", padx=7)
    timer_lbl = tk.Label(controls, text="Time: 0.0 s", font=("Arial", 11), bg="white")
    timer_lbl.pack(side="left", padx=15)
    status = tk.Label(controls, text="", font=("Arial", 11, "bold"), bg="white")
    status.pack(side="left", padx=10)

    sequence = tk.Frame(root, bg="white")
    sequence.pack(padx=12, pady=8)
    option_area = tk.Frame(root, bg="white")
    option_area.pack(fill="both", expand=True, padx=12)
    footer = tk.Frame(root, bg="white")
    footer.pack(fill="x", padx=16, pady=8)

    def clear(frame):
        for child in frame.winfo_children():
            child.destroy()

    def board_image(st, missing=False, size=130):
        if missing:
            im = Image.new("RGB", (BOARD, BOARD), "white")
            d = ImageDraw.Draw(im)
            # Match the dMAT style: empty square with a question mark.
            d.rectangle((1, 1, BOARD-2, BOARD-2), outline="black", width=3)
            d.text((BOARD//2-9, BOARD//2-23), "?", fill="black")
        else:
            im = render_state(st)
        return ImageTk.PhotoImage(im.resize((size, size)))

    image_refs = []

    def update_stats():
        acc = (state["score"] / state["attempts"] * 100) if state["attempts"] else 0
        best = "" if state["best_time"] is None else f"  •  Best {state['best_time']:.1f}s"
        stats.config(text=f"{state['score']} / {state['attempts']}  •  {acc:.1f}%  •  Streak {state['streak']}{best}")

    def tick():
        if state["question"] is not None and not state["submitted"]:
            timer_lbl.config(text=f"Time: {time.time()-state['started']:.1f} s")
        root.after(100, tick)

    def new_question():
        qdiff = {"Random":"random", "Low":"low", "Medium":"medium", "High":"high"}[diff.get()]
        state["question"] = generate_question(qdiff)
        state["choice1"] = None
        state["choice2"] = None
        state["submitted"] = False
        state["started"] = time.time()
        render_question()
        status.config(text=f"New {state['question']['difficulty'].upper()} question — find the rule!")
        timer_lbl.config(text="Time: 0.0 s")

    def select(which, idx, buttons):
        if state["submitted"]:
            return
        state["choice1" if which == 1 else "choice2"] = idx
        for j, b in enumerate(buttons):
            b.config(relief="sunken" if j == idx else "raised", bd=3 if j == idx else 1)

    def render_question():
        q = state["question"]
        clear(sequence)
        clear(option_area)
        clear(footer)
        image_refs.clear()

        tk.Label(sequence, text=f"Difficulty: {q['difficulty'].upper()}",
                 font=("Arial", 12, "bold"), bg="white").grid(row=0, column=0, columnspan=6, pady=(0,5))
        for i, st in enumerate(q["frames"]):
            photo = board_image(st, missing=(i >= 4), size=138)
            image_refs.append(photo)
            tk.Label(sequence, image=photo, bg="white").grid(row=1, column=i, padx=6)
            if i >= 4:
                tk.Label(sequence, text=f"Missing {i+1}", bg="white",
                         font=("Arial", 9, "bold")).grid(row=2, column=i)

        buttons_by_group = []
        for group, title in [(1, "Choose Figure 5"), (2, "Choose Figure 6")]:
            frame = tk.LabelFrame(option_area, text=title, font=("Arial", 11, "bold"),
                                  bg="white", padx=7, pady=7)
            frame.pack(side="left", fill="both", expand=True, padx=7)
            btns = []
            for i, st in enumerate(q[f"options_{group}"]):
                photo = board_image(st, False, 105)
                image_refs.append(photo)
                b = tk.Button(frame, image=photo, text=str(i+1), compound="top",
                              bg="white", command=lambda j=i, g=group, bs=btns: select(g,j,bs))
                b.grid(row=i//2, column=i%2, padx=5, pady=5)
                btns.append(b)
            buttons_by_group.append(btns)

        def submit():
            if state["choice1"] is None or state["choice2"] is None:
                status.config(text="Choose one option for BOTH missing figures.")
                return
            elapsed = time.time() - state["started"]
            state["attempts"] += 1
            a1, a2 = state["choice1"] + 1, state["choice2"] + 1
            both = a1 == q["answer_1"] and a2 == q["answer_2"]
            one = (a1 == q["answer_1"]) + (a2 == q["answer_2"])
            if both:
                state["score"] += 1
                state["streak"] += 1
                msg = f"✓ Both correct! {elapsed:.1f}s"
            elif one:
                state["streak"] = 0
                msg = f"½ One correct. Answers: {q['answer_1']} and {q['answer_2']}"
            else:
                state["streak"] = 0
                msg = f"✗ Not quite. Answers: {q['answer_1']} and {q['answer_2']}"
            if state["best_time"] is None or elapsed < state["best_time"]:
                state["best_time"] = elapsed
            state["submitted"] = True
            update_stats()
            status.config(text=msg)
            for bs in buttons_by_group:
                for b in bs:
                    b.config(state="disabled")

            clear(footer)
            tk.Label(footer, text="Rule breakdown", font=("Arial", 11, "bold"), bg="white").pack(anchor="w")
            for rule in q.get("rules", []):
                tk.Label(footer, text="• " + rule, anchor="w", justify="left", bg="white",
                         font=("Arial", 10)).pack(anchor="w")
            tk.Button(footer, text="Next Question →", font=("Arial", 11, "bold"),
                      command=new_question).pack(pady=7)

        tk.Button(footer, text="SUBMIT ANSWER", font=("Arial", 12, "bold"),
                  command=submit).pack(side="left", padx=5)
        tk.Button(footer, text="New Question", font=("Arial", 11),
                  command=new_question).pack(side="left", padx=5)

    tk.Button(controls, text="Reset Score", command=lambda: reset_score()).pack(side="right")

    def reset_score():
        state["score"] = state["attempts"] = state["streak"] = 0
        state["best_time"] = None
        update_stats()
        status.config(text="Score reset.")

    new_question()
    tick()
    root.mainloop()


# ------------------ command line entry point ------------------

if __name__=="__main__":
    import sys
    if "--gui" in sys.argv:
        launch_gui()
    elif "--export" in sys.argv:
        try:
            count = int(sys.argv[sys.argv.index("--export") + 1])
        except Exception:
            count = 10
        difficulty = "random"
        if "--difficulty" in sys.argv:
            try:
                difficulty = sys.argv[sys.argv.index("--difficulty") + 1].lower()
            except Exception:
                difficulty = "random"
        os.makedirs("dmat_generated", exist_ok=True)
        manifest=[]
        for _ in range(max(1,count)):
            q=generate_question(difficulty)
            path=save_question(q)
            manifest.append({"image":path,"answer_1":q["answer_1"],"answer_2":q["answer_2"],"difficulty":q["difficulty"],"seed":q.get("seed")})
        with open("dmat_generated/manifest.json","w",encoding="utf-8") as f:
            json.dump(manifest,f,indent=2)
        print(f"Generated {len(manifest)} questions in ./dmat_generated")
    else:
        print("dMAT Figure Sequence Generator")
        print("  GUI:    python dmat_figure_sequence_master.py --gui")
        print("  Export: python dmat_figure_sequence_master.py --export 25 --difficulty high")
        print("  Library: import dmat_figure_generator as d; d.generate_question('high')")
