from flask import Flask, jsonify, request, session, render_template, send_from_directory
from flask_cors import CORS
import os
import io
import base64
import secrets
from latin_square import get_dmat_puzzle
from math_generator import generate_math_system
from dmat_figure_sequence_master import generate_question, render_state
from database import (
    init_db, register_user, verify_user, 
    get_user_stats, update_user_stats, get_leaderboard,
    add_comment, get_comments
)

def state_to_data_url(state):
    im = render_state(state)
    buf = io.BytesIO()
    im.save(buf, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8')

app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path='/static')
app.secret_key = os.environ.get('SECRET_KEY', 'dmat_latin_square_secret_super_key_2026')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400 * 7

# Initialize DB tables
init_db()

# --- PAGE RENDERING ROUTES ---

@app.route('/')
def index_page():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/dashboard')
def dashboard_page():
    return render_template('dashboard.html')

@app.route('/practice/latin')
def latin_practice_page():
    return render_template('latin.html')

@app.route('/practice/math')
def math_practice_page():
    return render_template('math.html')

@app.route('/practice/figure')
def figure_practice_page():
    return render_template('figure.html')

@app.route('/test')
def test_exam_page():
    return render_template('test.html')

# --- AUTHENTICATION ROUTES ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')
    
    success, result = register_user(username, password)
    if success:
        session['user_id'] = result['id']
        session['username'] = result['username']
        stats = get_user_stats(result['id'])
        return jsonify({
            'success': True,
            'user': result,
            'stats': stats,
            'message': 'Account created successfully!'
        })
    else:
        return jsonify({'success': False, 'message': result}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')
    
    success, result = verify_user(username, password)
    if success:
        session['user_id'] = result['id']
        session['username'] = result['username']
        stats = get_user_stats(result['id'])
        return jsonify({
            'success': True,
            'user': result,
            'stats': stats,
            'message': 'Logged in successfully!'
        })
    else:
        return jsonify({'success': False, 'message': result}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully.'})

@app.route('/api/me', methods=['GET'])
def get_current_user():
    if 'user_id' in session:
        stats = get_user_stats(session['user_id'])
        return jsonify({
            'logged_in': True,
            'user': {
                'id': session['user_id'],
                'username': session['username']
            },
            'stats': stats
        })
    return jsonify({'logged_in': False})

# --- LATIN SQUARE PUZZLE ROUTES ---

@app.route('/api/puzzle', methods=['GET'])
def generate_puzzle():
    """Generates a new dMAT Latin Square puzzle."""
    puzzle_data = get_dmat_puzzle()
    session['current_answer'] = puzzle_data['answer']
    
    return jsonify({
        'puzzle': puzzle_data['puzzle'],
        'target_coordinate': puzzle_data['target_coordinate']
    })

@app.route('/api/submit', methods=['POST'])
def submit_answer():
    """Validates user answer for Latin Square and updates stats (5 points)."""
    data = request.get_json() or {}
    user_answer = (data.get('answer') or '').strip().upper()
    
    correct_answer = session.get('current_answer')
    if not correct_answer:
        return jsonify({'success': False, 'message': 'No active puzzle. Please fetch a new puzzle.'}), 400
        
    is_correct = (user_answer == correct_answer)
    
    updated_stats = None
    if 'user_id' in session:
        updated_stats = update_user_stats(session['user_id'], is_correct)
        
    return jsonify({
        'is_correct': is_correct,
        'correct_answer': correct_answer,
        'user_answer': user_answer,
        'stats': updated_stats
    })

# --- MATHEMATICAL EQUATIONS ROUTES ---

@app.route('/api/math_puzzle', methods=['GET'])
def generate_math_puzzle():
    """Generates a system of 4 mathematical equations with variables A, B, C, D."""
    math_data = generate_math_system()
    session['math_answers'] = math_data['answers']
    
    return jsonify({
        'equations': math_data['equations']
    })

@app.route('/api/submit_math', methods=['POST'])
def submit_math_answer():
    """Validates user answers for math system variables A, B, C, D."""
    data = request.get_json() or {}
    user_answers = data.get('answers', {})
    
    correct_answers = session.get('math_answers')
    if not correct_answers:
        return jsonify({'success': False, 'message': 'No active math puzzle found.'}), 400
        
    # Check all variables A, B, C, D
    is_correct = True
    details = {}
    for var in ['A', 'B', 'C', 'D']:
        try:
            val = int(user_answers.get(var, -999))
        except (ValueError, TypeError):
            val = None
        
        correct_val = correct_answers.get(var)
        var_match = (val == correct_val)
        details[var] = {
            'user': val,
            'correct': correct_val,
            'is_correct': var_match
        }
        if not var_match:
            is_correct = False
            
    updated_stats = None
    if 'user_id' in session:
        updated_stats = update_user_stats(session['user_id'], is_correct)
        
    return jsonify({
        'is_correct': is_correct,
        'details': details,
        'correct_answers': correct_answers,
        'stats': updated_stats
    })

# --- FIGURE SEQUENCE ROUTES ---

@app.route('/api/figure_sequence', methods=['GET'])
def get_figure_sequence():
    """Generates a new dMAT Figure Sequence question."""
    difficulty = request.args.get('difficulty', 'random').lower()
    if difficulty not in ['low', 'medium', 'high', 'random']:
        difficulty = 'random'
        
    try:
        q = generate_question(difficulty)
        session['figure_answer_1'] = q['answer_1']
        session['figure_answer_2'] = q['answer_2']
        session['figure_rules'] = q['rules']
        
        frames_urls = [state_to_data_url(st) for st in q['frames'][:4]]
        options_1_urls = [state_to_data_url(st) for st in q['options_1']]
        options_2_urls = [state_to_data_url(st) for st in q['options_2']]
        
        return jsonify({
            'success': True,
            'difficulty': q['difficulty'],
            'frames': frames_urls,
            'options_1': options_1_urls,
            'options_2': options_2_urls,
            'rules': q['rules']
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/submit_figure_sequence', methods=['POST'])
def submit_figure_sequence():
    """Validates user answer for Figure Sequence and updates stats (5 points)."""
    data = request.get_json() or {}
    try:
        user_ans_1 = int(data.get('answer_1', 0))
        user_ans_2 = int(data.get('answer_2', 0))
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Invalid answer indices.'}), 400
        
    correct_1 = session.get('figure_answer_1')
    correct_2 = session.get('figure_answer_2')
    rules = session.get('figure_rules', [])
    
    if correct_1 is None or correct_2 is None:
        return jsonify({'success': False, 'message': 'No active figure sequence puzzle found.'}), 400
        
    is_correct = (user_ans_1 == correct_1 and user_ans_2 == correct_2)
    one_correct = (user_ans_1 == correct_1) or (user_ans_2 == correct_2)
    
    updated_stats = None
    if 'user_id' in session:
        updated_stats = update_user_stats(session['user_id'], is_correct)
        
    return jsonify({
        'is_correct': is_correct,
        'one_correct': one_correct,
        'correct_1': correct_1,
        'correct_2': correct_2,
        'user_1': user_ans_1,
        'user_2': user_ans_2,
        'rules': rules,
        'stats': updated_stats
    })

# --- TIMED EXAM TEST ROUTES ---

@app.route('/api/test/generate', methods=['POST'])
def generate_test_exam():
    """Generates a 60-question exam test: 20 Latin Square + 20 Math + 20 Figure Sequence."""
    try:
        sec1_questions = []
        sec1_answers = {}
        for i in range(20):
            p = get_dmat_puzzle()
            sec1_questions.append({
                'id': i,
                'puzzle': p['puzzle'],
                'target_coordinate': p['target_coordinate']
            })
            sec1_answers[str(i)] = p['answer']

        sec2_questions = []
        sec2_answers = {}
        for i in range(20):
            m = generate_math_system()
            sec2_questions.append({
                'id': i,
                'equations': m['equations']
            })
            sec2_answers[str(i)] = m['answers']

        import random
        sec3_questions = []
        sec3_answers = {}
        diffs = ['low'] * 6 + ['medium'] * 8 + ['high'] * 6
        random.shuffle(diffs)

        for i in range(20):
            q = generate_question(diffs[i])
            sec3_questions.append({
                'id': i,
                'difficulty': q['difficulty'],
                'frames': [state_to_data_url(st) for st in q['frames'][:4]],
                'options_1': [state_to_data_url(st) for st in q['options_1']],
                'options_2': [state_to_data_url(st) for st in q['options_2']]
            })
            sec3_answers[str(i)] = {
                'ans1': q['answer_1'],
                'ans2': q['answer_2']
            }

        session['test_answers'] = {
            'sec1': sec1_answers,
            'sec2': sec2_answers,
            'sec3': sec3_answers
        }

        return jsonify({
            'success': True,
            'section1': sec1_questions,
            'section2': sec2_questions,
            'section3': sec3_questions
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/test/submit', methods=['POST'])
def submit_test_exam():
    """Evaluates 60 test questions, computes stats, percentage, and updates DB if user logged in."""
    data = request.get_json() or {}
    user_sec1 = data.get('section1', {})
    user_sec2 = data.get('section2', {})
    user_sec3 = data.get('section3', {})

    test_answers = session.get('test_answers')
    if not test_answers:
        return jsonify({'success': False, 'message': 'No active test found. Please restart the test.'}), 400

    sec1_keys = test_answers.get('sec1', {})
    sec2_keys = test_answers.get('sec2', {})
    sec3_keys = test_answers.get('sec3', {})

    sec1_answered = 0
    sec1_correct = 0
    sec1_wrong = 0
    for i in range(20):
        s_i = str(i)
        user_ans = (user_sec1.get(s_i) or '').strip().upper()
        if user_ans:
            sec1_answered += 1
            if user_ans == sec1_keys.get(s_i):
                sec1_correct += 1
            else:
                sec1_wrong += 1

    sec2_answered = 0
    sec2_correct = 0
    sec2_wrong = 0
    for i in range(20):
        s_i = str(i)
        user_ans = user_sec2.get(s_i) or {}
        has_ans = any(user_ans.get(v) is not None and str(user_ans.get(v)).strip() != '' for v in ['A','B','C','D'])
        if has_ans:
            sec2_answered += 1
            correct_dict = sec2_keys.get(s_i, {})
            all_match = True
            for v in ['A','B','C','D']:
                try:
                    u_v = int(user_ans.get(v))
                except (TypeError, ValueError):
                    u_v = None
                if u_v != correct_dict.get(v):
                    all_match = False
                    break
            if all_match:
                sec2_correct += 1
            else:
                sec2_wrong += 1

    sec3_answered = 0
    sec3_correct = 0
    sec3_wrong = 0
    for i in range(20):
        s_i = str(i)
        user_ans = user_sec3.get(s_i) or {}
        ans1 = user_ans.get('ans1')
        ans2 = user_ans.get('ans2')
        if ans1 is not None and ans2 is not None:
            sec3_answered += 1
            correct_dict = sec3_keys.get(s_i, {})
            if int(ans1) == correct_dict.get('ans1') and int(ans2) == correct_dict.get('ans2'):
                sec3_correct += 1
            else:
                sec3_wrong += 1

    total_questions = 60
    total_answered = sec1_answered + sec2_answered + sec3_answered
    total_correct = sec1_correct + sec2_correct + sec3_correct
    total_wrong = total_answered - total_correct
    percentage = round((total_correct / 60.0) * 100, 1)

    updated_stats = None
    if 'user_id' in session:
        for _ in range(total_correct):
            updated_stats = update_user_stats(session['user_id'], is_correct=True)

    return jsonify({
        'success': True,
        'total_questions': total_questions,
        'answered_questions': total_answered,
        'correct_questions': total_correct,
        'wrong_questions': total_wrong,
        'percentage': percentage,
        'sections': {
            'latin': { 'total': 20, 'answered': sec1_answered, 'correct': sec1_correct, 'wrong': sec1_wrong },
            'math': { 'total': 20, 'answered': sec2_answered, 'correct': sec2_correct, 'wrong': sec2_wrong },
            'figure': { 'total': 20, 'answered': sec3_answered, 'correct': sec3_correct, 'wrong': sec3_wrong }
        },
        'stats': updated_stats
    })

# --- LEADERBOARD ROUTE ---

@app.route('/api/leaderboard', methods=['GET'])
def leaderboard():
    """Returns top players ranking."""
    top_players = get_leaderboard(limit=10)
    return jsonify({'leaderboard': top_players})

# --- RATINGS & COMMENTS ROUTES ---

@app.route('/api/comments', methods=['GET'])
def fetch_comments():
    """Returns all candidate ratings and comments with average statistics."""
    data = get_comments()
    return jsonify({'success': True, **data})

@app.route('/api/comments', methods=['POST'])
def submit_comment():
    """Submits a new candidate rating and comment."""
    data = request.get_json() or {}
    user_name = data.get('user_name', '')
    if 'username' in session and not user_name:
        user_name = session['username']
    rating = data.get('rating')
    comment = data.get('comment', '')

    success, message = add_comment(user_name, rating, comment)
    if success:
        updated_data = get_comments()
        return jsonify({
            'success': True,
            'message': message,
            **updated_data
        })
    else:
        return jsonify({'success': False, 'message': message}), 400

if __name__ == '__main__':
    print("Starting dMAT Logic Arena server on http://127.0.0.1:5000 ...")
    app.run(debug=True, port=5000)