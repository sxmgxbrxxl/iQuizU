import os
import re

files = [
    r'c:\Users\Admin\Downloads\iQuizUNew\frontend\src\pages\studentSide\TakeSyncQuiz.jsx',
    r'c:\Users\Admin\Downloads\iQuizUNew\frontend\src\pages\studentSide\TakeAsyncQuiz.jsx',
    r'c:\Users\Admin\Downloads\iQuizUNew\frontend\src\pages\studentSide\WaitingRoom.jsx',
    r'c:\Users\Admin\Downloads\iQuizUNew\frontend\src\pages\studentSide\QuizResults.jsx'
]

def replace_theme(content):
    content = re.sub(r'(from|to|bg|text|border|ring|hover:bg|hover:border)-blue-(\d{2,3})', r'\1-green-\2', content)
    content = re.sub(r'(from|to|bg|text|border|ring|hover:bg|hover:border)-purple-(\d{2,3})', r'\1-green-\2', content)
    return content

for file_path in files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        content = replace_theme(content)
        
        # fix the specific functions with correct formatting
        # since everything became green, we replace the specific cases back 
        content = content.replace(
            'case "multiple_choice":\n        return "bg-green-100 text-green-700 border-green-300";',
            'case "multiple_choice":\n        return "bg-purple-100 text-purple-700 border-purple-300";'
        )
        content = content.replace(
            'case "identification":\n        return "bg-green-100 text-green-700 border-green-300";',
            'case "identification":\n        return "bg-blue-100 text-blue-700 border-blue-300";'
        )
        content = content.replace(
            'case "true_false":\n        return "bg-green-100 text-green-700 border-green-300";',
            'case "true_false":\n        return "bg-emerald-100 text-emerald-700 border-emerald-300";'
        )

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f'Processed {file_path}')
    except Exception as e:
        print(f'Error on {file_path}: {e}')
