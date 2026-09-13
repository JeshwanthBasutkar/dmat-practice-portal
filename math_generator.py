import random

def generate_math_system():
    """
    Generates a system of 4 equations with dynamic operators (+, -, *, /).
    Guarantees integer solutions between 1 and 20.
    """
    # Step 1: Forward-calculate the variables to ensure clean integers
    A = random.randint(2, 6)
    multiplier = random.randint(2, 3)
    B = A * multiplier
    C = random.randint(4, 18)
    D = random.randint(2, 15)
    
    equations = []
    
    # Equation 1: Relate A and B (Randomize * or /)
    if random.choice([True, False]):
        equations.append(f"{multiplier} * A = B")
    else:
        equations.append(f"B / {multiplier} = A")
        
    # Equation 2: Relate A, B, and C (Randomize +, - structures)
    eq2_style = random.randint(1, 3)
    if eq2_style == 1:
        equations.append(f"A + B - C = {A + B - C}")
    elif eq2_style == 2:
        equations.append(f"C - A + B = {C - A + B}")
    else:
        equations.append(f"B + C - A = {B + C - A}")
    
    # Equation 3: Relate C and D (Randomize +, - structures)
    if random.choice([True, False]):
        equations.append(f"C - D = {C - D}")
    else:
        equations.append(f"D + {C - D} = C") if C > D else equations.append(f"C + {D - C} = D")
    
    # Equation 4: Relate A and D (Randomize +, -, or *)
    eq4_style = random.choice(['+', '-', '*'])
    if eq4_style == '+':
        equations.append(f"A + D = {A + D}")
    elif eq4_style == '-':
        # Ensure we don't create negative results for the string
        if D > A:
            equations.append(f"D - A = {D - A}")
        else:
            equations.append(f"A - D = {A - D}")
    else:
        # Throw in a multiplier for extra difficulty
        equations.append(f"A * 2 + D = {A * 2 + D}")
    
    # Shuffle the order of equations so the logic path is never identical
    random.shuffle(equations)
    
    return {
        "equations": equations,
        "answers": {
            "A": A,
            "B": B,
            "C": C,
            "D": D
        }
    }

# --- Test the script ---
if __name__ == "__main__":
    problem = generate_math_system()
    print("Generated Equations:")
    for eq in problem["equations"]:
        print(eq)
    print("\nAnswers:", problem["answers"])