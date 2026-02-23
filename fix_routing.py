import os

path = r'c:\Users\kaceb\OneDrive\Documents\CTAX\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace training view ID and component
content = content.replace("currentView === 'training' ? <TrainingView />", "currentView === 'education' ? <EducationCenter />")

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Successfully updated App.tsx routing.")
