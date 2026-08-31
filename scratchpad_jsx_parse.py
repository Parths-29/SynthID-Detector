import sys

def check_brackets(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    
    # We only care about checking the brackets
    for line_num, line in enumerate(lines, 1):
        for col_num, char in enumerate(line, 1):
            if char in '{[(':
                stack.append((char, line_num, col_num))
            elif char in '}])':
                if not stack:
                    print(f"Error: Unmatched closing bracket '{char}' at line {line_num}, col {col_num}")
                    return
                last_char, last_line, last_col = stack.pop()
                expected_open = {'}': '{', ']': '[', ')': '('}[char]
                if last_char != expected_open:
                    print(f"Error: Mismatched closing bracket '{char}' at line {line_num}, col {col_num}.")
                    print(f"       Expected to close '{last_char}' from line {last_line}, col {last_col}")
                    return
    
    if stack:
        print("Error: Unclosed brackets:")
        for char, line, col in stack:
            print(f"  {char} at line {line}, col {col}")
    else:
        print("All brackets are balanced.")

if __name__ == "__main__":
    check_brackets("frontend/src/components/ui/animated-ai-chat.tsx")
