import { Button } from '../Components/ui/button';

/**
 * Test page to verify shadcn/ui setup with ClickUp theme
 */
export function ShadcnTestPage() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold text-foreground">
        ✅ shadcn/ui Setup Test
      </h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Button Variants</h2>
        
        <div className="flex gap-4 flex-wrap">
          <Button variant="default">Primary (ClickUp Purple)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        
        <div className="flex gap-4 flex-wrap">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">ClickUp Brand Colors</h2>
        
        <div className="flex gap-4 flex-wrap">
          <div className="bg-[#7B68EE] text-white px-4 py-2 rounded">
            Primary Purple #7B68EE
          </div>
          <div className="bg-[#FD71AF] text-white px-4 py-2 rounded">
            Accent Pink #FD71AF
          </div>
          <div className="bg-[#49CCF9] text-white px-4 py-2 rounded">
            Accent Blue #49CCF9
          </div>
          <div className="bg-[#FFC800] text-black px-4 py-2 rounded">
            Accent Yellow #FFC800
          </div>
          <div className="bg-[#292D34] text-white px-4 py-2 rounded">
            Dark Base #292D34
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Test Status</h2>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <strong>✅ Success!</strong> If you see styled buttons above with purple primary color, 
          shadcn/ui with ClickUp theme is working correctly!
        </div>
      </div>
    </div>
  );
}
