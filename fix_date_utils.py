import os

path = r'c:\Users\kaceb\OneDrive\Documents\CTAX\utils\dateUtils.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'export const getRelativeTime = (isoString: string)' in line:
        new_lines.append("export const getRelativeTime = (isoString?: string): { label: string, isPast: boolean } => {\n")
        new_lines.append("  if (!isoString) return { label: 'TBD', isPast: false };\n")
        new_lines.append("  const date = new Date(isoString);\n")
        new_lines.append("  if (isNaN(date.getTime())) return { label: 'TBD', isPast: false };\n")
        new_lines.append("\n")
        new_lines.append("  const target = date.getTime();\n")
        skip = True
        continue
    if skip:
        if 'const target = new Date(isoString).getTime();' in line:
            continue
        if 'const target =' in line and 'new Date(isoString)' not in line: # Fallback safety
             skip = False
        if '};' in line and (lines.index(line) > lines.index("export const getRelativeTime") + 5 if "export const getRelativeTime" in str(lines) else True):
             # Actually we can just replace the whole function if we want to be safe
             pass

# Alternative approach: full replacement
content = "".join(lines)
old_func = """export const getRelativeTime = (isoString: string): { label: string, isPast: boolean } => {
  const target = new Date(isoString).getTime();
  const now = new Date().getTime();
  const diffInMs = target - now;
  const isPast = diffInMs < 0;
  const absDiff = Math.abs(diffInMs);

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return { label: `${days}d ${isPast ? 'ago' : 'away'}`, isPast };
  if (hours > 0) return { label: `${hours}h ${isPast ? 'ago' : 'away'}`, isPast };
  if (minutes > 0) return { label: `${minutes}m ${isPast ? 'ago' : 'away'}`, isPast };
  return { label: isPast ? 'Just now' : 'Starting now', isPast };
};"""

new_func = """export const getRelativeTime = (isoString?: string): { label: string, isPast: boolean } => {
  if (!isoString) return { label: 'TBD', isPast: false };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { label: 'TBD', isPast: false };

  const target = d.getTime();
  const now = new Date().getTime();
  const diffInMs = target - now;
  const isPast = diffInMs < 0;
  const absDiff = Math.abs(diffInMs);

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return { label: `${days}d ${isPast ? 'ago' : 'away'}`, isPast };
  if (hours > 0) return { label: `${hours}h ${isPast ? 'ago' : 'away'}`, isPast };
  if (minutes > 0) return { label: `${minutes}m ${isPast ? 'ago' : 'away'}`, isPast };
  return { label: isPast ? 'Just now' : 'Starting now', isPast };
};"""

# Clean up whitespace issues for matching
content = content.replace(old_func.replace("\r\n", "\n"), new_func)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Successfully updated getRelativeTime.")
