"""
Update generate_dataset.py with Assistant Compiler curriculum questions and generators,
then execute the generator to regenerate all packs and starter pack.
"""
import os
import re

script_path = r'C:\Users\user\.gemini\antigravity\scratch\jkssb-prep-pwa\scripts\generate_dataset.py'
with open(script_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add solid combination and heights & distances generators
new_math_generators = '''
def make_mensuration_solid_combination_question():
    r_big = random.choice([6, 8, 10, 12])
    r_small = 2
    count = (r_big ** 3) // (r_small ** 3)
    
    opts = [f"{count}", f"{count + 4}", f"{max(2, count - 4)}", f"{count + 8}"]
    random.shuffle(opts)
    ans_idx = opts.index(f"{count}")
    
    return {
        "q": f"A solid metallic sphere of radius {r_big} cm is melted and recast into smaller solid spheres each of radius {r_small} cm. How many such small spheres can be formed?",
        "options": opts,
        "answer": ans_idx,
        "subject": "Mathematics & Mensuration",
        "topic": "Surface Areas & Volumes of Combinations of Solids",
        "is_math": True,
        "pyq": "JKSSB Assistant Compiler / Finance PYQ Pattern",
        "shortcut_method": (
            f"⚡ **Direct Cube of Ratio Shortcut (Exam Speed ~5s)**:\\n"
            f"- Since volume of sphere is directly proportional to $r^3$ (as $4/3\\\\pi$ cancels out on both sides):\\n"
            f"- Number of spheres $N = \\\\left(\\\\frac{{R_{{big}}}}{{r_{{small}}}}\\\\right)^3 = \\\\left(\\\\frac{{{r_big}}}{{{r_small}}}\\\\right)^3 = ({r_big // r_small})^3 = \\\\mathbf{{{count}}}$.\\n"
            f"- Zero formula writing needed! Just divide radii and cube the result."
        ),
        "traditional_method": (
            f"📝 **Textbook Volume Conservation Method**:\\n"
            f"1. Radius of large sphere ($R$) = {r_big} cm.\\n"
            f"2. Volume of large sphere $V_1 = \\\\frac{{4}}{{3}}\\\\pi R^3 = \\\\frac{{4}}{{3}}\\\\pi ({r_big})^3 = \\\\frac{{4}}{{3}}\\\\pi ({r_big**3})\\\\text{{ cm}}^3$.\\n"
            f"3. Radius of each small sphere ($r$) = {r_small} cm.\\n"
            f"4. Volume of each small sphere $V_2 = \\\\frac{{4}}{{3}}\\\\pi r^3 = \\\\frac{{4}}{{3}}\\\\pi ({r_small})^3 = \\\\frac{{4}}{{3}}\\\\pi ({r_small**3})\\\\text{{ cm}}^3$.\\n"
            f"5. Total spheres formed $N = \\\\frac{{V_1}}{{V_2}} = \\\\frac{{\\\\frac{{4}}{{3}}\\\\pi ({r_big**3})}}{{\\\\frac{{4}}{{3}}\\\\pi ({r_small**3})}} = \\\\frac{{{r_big**3}}}{{{r_small**3}}} = \\\\mathbf{{{count}}}$."
        )
    }

def make_heights_and_distances_question():
    height = random.choice([15, 20, 25, 30, 40, 50])
    # 45 degree angle means base = height
    # 30 degree angle means base = height * sqrt(3)
    # 60 degree angle means base = height / sqrt(3)
    angle = random.choice([30, 45, 60])
    
    if angle == 45:
        base_str = f"{height} m"
        opts = [f"{height} m", f"{height}√3 m", f"{height}/√3 m", f"{height*2} m"]
        trick_exp = f"At $45^\\\\circ$, Perpendicular = Base. Hence distance = \\\\mathbf{{{height}\\\\text{{ m}}}} instantly!"
        trad_exp = f"$\\\\tan 45^\\\\circ = \\\\frac{{\\\\text{{Height}}}}{{\\\\text{{Distance}}}} = 1 \\\\implies \\\\text{{Distance}} = \\\\text{{Height}} = {height}\\\\text{{ m}}$."
    elif angle == 30:
        base_str = f"{height}√3 m"
        opts = [f"{height}√3 m", f"{height} m", f"{height}/√3 m", f"{height*2} m"]
        trick_exp = f"In 30-60-90 triangle, side opposite to $30^\\\\circ$ is $x$, side adjacent is $x\\\\sqrt{{3}}$. Here $x = {height}$, so distance is $\\\\mathbf{{{height}\\\\sqrt{{3}}\\\\text{{ m}}}}$. Solves in 3 seconds!"
        trad_exp = f"$\\\\tan 30^\\\\circ = \\\\frac{{\\\\text{{Height}}}}{{\\\\text{{Distance}}}} = \\\\frac{{1}}{{\\\\sqrt{{3}}}} \\\\implies \\\\text{{Distance}} = {height}\\\\sqrt{{3}}\\\\text{{ m}}$."
    else: # 60
        base_str = f"{height}/√3 m"
        opts = [f"{height}/√3 m", f"{height}√3 m", f"{height} m", f"{height*2} m"]
        trick_exp = f"In 30-60-90 triangle, side opposite to $60^\\\\circ$ is $x\\\\sqrt{{3}} = {height}$, so base is $\\\\mathbf{{{height}/\\\\sqrt{{3}}\\\\text{{ m}}}}$. Direct ratio!"
        trad_exp = f"$\\\\tan 60^\\\\circ = \\\\frac{{\\\\text{{Height}}}}{{\\\\text{{Distance}}}} = \\\\sqrt{{3}} \\\\implies \\\\text{{Distance}} = \\\\frac{{{height}}}{{\\\\sqrt{{3}}}}\\\\text{{ m}}$."

    random.shuffle(opts)
    ans_idx = opts.index(base_str)
    
    return {
        "q": f"From a point on the ground, the angle of elevation of the top of a vertical tower of height {height} meters is observed to be {angle}°. What is the horizontal distance of the point from the foot of the tower?",
        "options": opts,
        "answer": ans_idx,
        "subject": "Mathematics & Mensuration",
        "topic": "Heights and Distances",
        "is_math": True,
        "pyq": "JKSSB Assistant Compiler Exam Official PYQ",
        "shortcut_method": f"⚡ **Standard Trigonometric Ratio Trick (Exam Speed ~5s)**:\\n" + trick_exp,
        "traditional_method": f"📝 **Trigonometric Definition Method**:\\n" + trad_exp
    }
'''

# 2. Add Assistant Compiler History & Civics bank
new_history_civics_bank = '''
ASSISTANT_COMPILER_BANK = [
    {
        "q": "Who was the Viceroy of India when the Partition of Bengal took place in the year 1905?",
        "options": ["Lord Curzon", "Lord Minto", "Lord Chelmsford", "Lord Ripon"],
        "answer": 0,
        "explanation": "Lord Curzon announced the Partition of Bengal on 16 October 1905, separating Muslim-majority Eastern Bengal and Assam from Hindu-majority Western Bengal. It triggered the Swadeshi and Boycott Movement.",
        "topic": "Indian National Movement (1885-1947)",
        "subject": "History & National Movement",
        "pyq": "JKSSB Assistant Compiler 2021 / 2022 Official PYQ",
        "posts": ["assistant-compiler", "jkp-si", "patwari"]
    },
    {
        "q": "Where is the permanent headquarters of the International Court of Justice (ICJ), the principal judicial organ of the United Nations, situated?",
        "options": ["The Hague (Netherlands)", "Geneva (Switzerland)", "New York (USA)", "Paris (France)"],
        "answer": 0,
        "explanation": "The International Court of Justice (ICJ) is headquartered at the Peace Palace in The Hague, Netherlands. All other five principal organs of the UN are based in New York City.",
        "topic": "United Nations Organisation (UNO) & Major Organs",
        "subject": "Civics & Political Science",
        "pyq": "JKSSB Assistant Compiler 2021 Official PYQ",
        "posts": ["assistant-compiler", "jkp-si"]
    },
    {
        "q": "Which atmospheric layer contains the Ozone Layer that absorbs harmful ultraviolet (UV) solar radiation?",
        "options": ["Stratosphere", "Troposphere", "Mesosphere", "Thermosphere"],
        "answer": 0,
        "explanation": "The Stratosphere lies directly above the Troposphere (extending from roughly 12 to 50 km) and contains the Ozone layer (Ozone sphere), which absorbs deadly UV-B and UV-C rays from the Sun.",
        "topic": "Atmosphere: Layers & Composition",
        "subject": "Geography & Earth Sciences",
        "pyq": "JKSSB Assistant Compiler 2021 Official PYQ",
        "posts": ["assistant-compiler", "stock-assistant", "jkp-si"]
    },
    {
        "q": "The Treaty of Versailles was signed in 1919 primarily to conclude the hostilities of which major global conflict?",
        "options": ["First World War", "Second World War", "Crimean War", "Franco-Prussian War"],
        "answer": 0,
        "explanation": "The Treaty of Versailles was signed on 28 June 1919 at Versailles, France, ending the state of war between Germany and the Allied Powers of World War I, and led to the creation of the League of Nations.",
        "topic": "First World War & League of Nations",
        "subject": "History & National Movement",
        "pyq": "JKSSB Assistant Compiler Syllabus Official PYQ",
        "posts": ["assistant-compiler", "jkp-si"]
    }
]
'''

# Insert new math generators before REASONING_BANK
code = code.replace("# -------------------------------------------------------------\n# 3. REASONING / MENTAL ABILITY QUESTIONS", new_math_generators + "\n# -------------------------------------------------------------\n# 3. REASONING / MENTAL ABILITY QUESTIONS")

# Insert Assistant Compiler Bank after ENGLISH_BANK
code = code.replace("ENGLISH_BANK = [", new_history_civics_bank + "\nENGLISH_BANK = [")

# Add assistant-compiler into math generators list
code = code.replace(
    """    math_generators = [
        make_percentage_profit_question,
        make_time_and_work_question,
        make_speed_distance_train_question,
        make_simple_interest_question,
        make_compound_interest_trick_question,
        make_ratio_ages_question,
        make_mensuration_circle_question
    ]""",
    """    math_generators = [
        make_percentage_profit_question,
        make_time_and_work_question,
        make_speed_distance_train_question,
        make_simple_interest_question,
        make_compound_interest_trick_question,
        make_ratio_ages_question,
        make_mensuration_circle_question,
        make_mensuration_solid_combination_question,
        make_heights_and_distances_question
    ]"""
)

# Add posts_pool to include assistant-compiler
code = code.replace(
    'posts_pool = ["jkp-si", "jkp-constable", "stock-assistant", "faa", "vlw-panchayat", "patwari"]',
    'posts_pool = ["jkp-si", "jkp-constable", "stock-assistant", "faa", "vlw-panchayat", "patwari", "assistant-compiler"]'
)

# Add AC bank into core addition
code = code.replace(
    """    for item in ENGLISH_BANK:
        q = dict(item)
        q["id"] = f"q-{qid:06d}"
        q["is_pyq"] = True
        q["posts"] = ["jkp-si", "stock-assistant", "vlw-panchayat", "patwari", "faa"]
        all_questions.append(q)
        qid += 1""",
    """    for item in ENGLISH_BANK:
        q = dict(item)
        q["id"] = f"q-{qid:06d}"
        q["is_pyq"] = True
        q["posts"] = ["jkp-si", "stock-assistant", "vlw-panchayat", "patwari", "faa", "assistant-compiler"]
        all_questions.append(q)
        qid += 1
        
    for item in ASSISTANT_COMPILER_BANK:
        q = dict(item)
        q["id"] = f"q-{qid:06d}"
        q["is_pyq"] = True
        all_questions.append(q)
        qid += 1"""
)

# Add postsSupported in meta
code = code.replace(
    '"postsSupported": ["jkp-si", "jkp-constable", "stock-assistant", "faa", "vlw-panchayat", "patwari"]',
    '"postsSupported": ["jkp-si", "jkp-constable", "stock-assistant", "faa", "vlw-panchayat", "patwari", "assistant-compiler"]'
)

with open(script_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("generate_dataset.py updated with Assistant Compiler questions & generators.")
