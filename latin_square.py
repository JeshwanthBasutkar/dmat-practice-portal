import random
import copy
import json

def generate_full_board(n=5):
    """Generates a complete, valid nxn Latin Square using backtracking."""
    symbols = ['A', 'B', 'C', 'D', 'E']
    board = [['' for _ in range(n)] for _ in range(n)]
    
    def is_safe(board, row, col, val):
        # Check row and column for duplicates
        for i in range(n):
            if board[row][i] == val or board[i][col] == val:
                return False
        return True
        
    def solve(board):
        for row in range(n):
            for col in range(n):
                if board[row][col] == '':
                    # Shuffle symbols to ensure a unique grid every time
                    random.shuffle(symbols)
                    for val in symbols:
                        if is_safe(board, row, col, val):
                            board[row][col] = val
                            if solve(board):
                                return True
                            # Backtrack if it leads to an invalid state
                            board[row][col] = ''
                    return False
        return True
        
    solve(board)
    return board

def create_puzzle(board, n=5, blanks=15):
    """Removes elements to create a puzzle and sets a target '?'."""
    puzzle = copy.deepcopy(board)
    
    # Create a list of all coordinates
    all_cells = [(r, c) for r in range(n) for c in range(n)]
    random.shuffle(all_cells)
    
    # Select the cells to be blanked out
    cells_to_remove = all_cells[:blanks]
    
    for r, c in cells_to_remove:
        puzzle[r][c] = ''
        
    # Pick the first removed cell to be our target question mark
    target_row, target_col = cells_to_remove[0]
    correct_answer = board[target_row][target_col]
    puzzle[target_row][target_col] = '?'
    
    return puzzle, correct_answer, (target_row, target_col)

def get_dmat_puzzle():
    """Generates a dictionary ready to be sent to a frontend."""
    full_board = generate_full_board()
    
    # High difficulty usually has around 14 to 17 blanks
    puzzle_board, answer, target_coords = create_puzzle(full_board, blanks=16)
    
    return {
        "puzzle": puzzle_board,
        "answer": answer,
        "target_coordinate": {"row": target_coords[0], "col": target_coords[1]}
    }

# --- Test the script ---
if __name__ == "__main__":
    puzzle_data = get_dmat_puzzle()
    
    print("Generated dMAT Latin Square:")
    for row in puzzle_data["puzzle"]:
        # Print with nice formatting for terminal viewing
        print([cell if cell != '' else ' ' for cell in row])
        
    print(f"\nTarget '?': Row {puzzle_data['target_coordinate']['row']}, Col {puzzle_data['target_coordinate']['col']}")
    print(f"Correct Answer: {puzzle_data['answer']}")