import os

path = r'c:\Users\kaceb\OneDrive\Documents\CTAX\utils\dateUtils.ts'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

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

# Find the start of the function and the end
start_marker = "export const getRelativeTime = (isoString: string)"
start_idx = text.find(start_marker)

if start_idx != -1:
    # Find the next '};' after the start
    end_idx = text.find("};", start_idx) + 2
    if end_idx != -1:
        new_text = text[:start_idx] + new_func + text[end_idx:]
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(new_text)
        print("Successfully patched getRelativeTime.")
    else:
        print("Could not find end of function.")
else:
    print("Could not find start marker.")
