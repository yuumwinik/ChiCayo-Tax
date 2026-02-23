import os

def rebrand():
    replacements = {
        "ChiCayo Tax": "Community Tax",
        "ChiCayo": "Community Tax",
        "chicayotax": "communitytax"
    }
    
    files_to_update = [
        "package.json",
        "metadata.json",
        "index.html",
        "manifest.json",
        "electron.js",
        "components/WeeklyRecapModal.tsx",
        "components/TaxterChat.tsx",
        "components/TutorialOverlay.tsx",
        "components/Sidebar.tsx",
        "components/EarningsPanel.tsx",
        "components/EarningsFullView.tsx",
        "components/AuthScreen.tsx",
        "components/AdminDashboard.tsx",
        "components/Admin/IncentiveBuilder.tsx"
    ]
    
    for file_path in files_to_update:
        abs_path = os.path.join(os.getcwd(), file_path)
        if os.path.exists(abs_path):
            with open(abs_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements.items():
                new_content = new_content.replace(old, new)
            
            if new_content != content:
                with open(abs_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file_path}")
        else:
            print(f"File not found: {file_path}")

if __name__ == "__main__":
    rebrand()
