import re

# Read the file
with open('Education.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = "import { useNavigate } from 'react-router-dom';"
new_import = "import { useNavigate, useSearchParams } from 'react-router-dom';"
content = content.replace(old_import, new_import)

# 2. Update component initialization - add search params hook
old_init = """export const Education: React.FC = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();"""

new_init = """export const Education: React.FC = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();"""

content = content.replace(old_init, new_init)

# 3. Add new useEffect after first useEffect to sync with URL
# Find the location after the first useEffect that loads progress
# We'll add a new effect that syncs URL params to state

# Save the file
with open('Education.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 1-2: Updated imports and initialization")
