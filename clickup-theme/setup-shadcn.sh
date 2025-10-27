#!/bin/bash

# ============================================
# MUI to shadcn/ui Migration Setup Script
# ============================================
# Run this script to automatically setup shadcn/ui in your React project

echo "🚀 Starting shadcn/ui setup..."
echo ""

# Step 1: Install Tailwind CSS v4
echo "📦 Step 1: Installing Tailwind CSS v4..."
npm install tailwindcss @tailwindcss/vite

# Step 2: Install Node types
echo "📦 Step 2: Installing Node types..."
npm install -D @types/node

# Step 3: Update package.json scripts (optional)
echo "✏️  Step 3: Verifying scripts..."
# Scripts should already exist from Vite setup

# Step 4: Create/Update vite.config.ts
echo "⚙️  Step 4: Creating vite.config.ts..."
cat > vite.config.ts << 'EOF'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
EOF

# Step 5: Update tsconfig.json
echo "⚙️  Step 5: Updating tsconfig.json..."
# Backup original
cp tsconfig.json tsconfig.json.backup

# Update with baseUrl and paths
cat > tsconfig.json << 'EOF'
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
EOF

# Step 6: Update tsconfig.app.json
echo "⚙️  Step 6: Updating tsconfig.app.json..."
# Backup original
cp tsconfig.app.json tsconfig.app.json.backup

# Read the existing file and add baseUrl and paths
node << 'EOF'
const fs = require('fs');
try {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.app.json', 'utf8'));
  tsconfig.compilerOptions = tsconfig.compilerOptions || {};
  tsconfig.compilerOptions.baseUrl = ".";
  tsconfig.compilerOptions.paths = { "@/*": ["./src/*"] };
  fs.writeFileSync('tsconfig.app.json', JSON.stringify(tsconfig, null, 2));
  console.log('✅ tsconfig.app.json updated successfully');
} catch (error) {
  console.error('⚠️  Error updating tsconfig.app.json:', error.message);
}
EOF

# Step 7: Update CSS file
echo "🎨 Step 7: Updating CSS file..."
# Backup original CSS
if [ -f "src/index.css" ]; then
  cp src/index.css src/index.css.backup
fi

# Create new CSS with Tailwind import
cat > src/index.css << 'EOF'
@import "tailwindcss";

@layer base {
  :root {
    /* ClickUp Primary Purple */
    --primary: 252 49% 68%;
    --primary-foreground: 0 0% 100%;
    
    /* ClickUp Accents */
    --accent-pink: 335 98% 71%;
    --accent-blue: 196 96% 65%;
    --accent-yellow: 45 100% 50%;
    
    /* Base Colors */
    --background: 0 0% 100%;
    --foreground: 216 12% 19%;
    
    --card: 0 0% 100%;
    --card-foreground: 216 12% 19%;
    
    --popover: 0 0% 100%;
    --popover-foreground: 216 12% 19%;
    
    --secondary: 210 7% 78%;
    --secondary-foreground: 216 12% 19%;
    
    --muted: 210 7% 78%;
    --muted-foreground: 215 12% 45%;
    
    --accent: 252 49% 68%;
    --accent-foreground: 0 0% 100%;
    
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    
    --border: 214 14% 90%;
    --input: 214 14% 90%;
    --ring: 252 49% 68%;
    
    --radius: 0.5rem;
  }

  .dark {
    --background: 216 12% 19%;
    --foreground: 0 0% 100%;
    
    --card: 220 13% 22%;
    --card-foreground: 0 0% 100%;
    
    --popover: 220 13% 22%;
    --popover-foreground: 0 0% 100%;
    
    --primary: 252 49% 68%;
    --primary-foreground: 0 0% 100%;
    
    --secondary: 217 14% 27%;
    --secondary-foreground: 0 0% 100%;
    
    --muted: 217 14% 27%;
    --muted-foreground: 215 16% 65%;
    
    --accent: 252 49% 68%;
    --accent-foreground: 0 0% 100%;
    
    --border: 217 14% 27%;
    --input: 217 14% 27%;
    --ring: 252 49% 68%;
  }
}

@layer utilities {
  .clickup-purple { @apply text-[#7B68EE]; }
  .clickup-pink { @apply text-[#FD71AF]; }
  .clickup-blue { @apply text-[#49CCF9]; }
  .clickup-yellow { @apply text-[#FFC800]; }
}
EOF

echo ""
echo "✅ Basic setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run: npx shadcn@latest init"
echo "   - Choose 'Neutral' as base color"
echo "   - Choose 'Yes' for CSS variables"
echo ""
echo "2. Install components you need:"
echo "   npx shadcn@latest add button"
echo "   npx shadcn@latest add input"
echo "   npx shadcn@latest add card"
echo "   etc..."
echo ""
echo "3. Start migrating components from MUI to shadcn!"
echo ""
echo "🎉 Setup script completed successfully!"
