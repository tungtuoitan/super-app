import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import {
    Sparkles,
    Zap,
    Heart,
    AlertCircle,
    CheckCircle2,
    Info
} from 'lucide-react';

/**
 * ClickUp Theme Demo Page
 *
 * Showcases all ClickUp brand colors and component styles:
 * - Primary Purple: #7B68EE
 * - Accent Pink: #FD71AF
 * - Accent Blue: #49CCF9
 * - Accent Yellow: #FFC800
 * - Dark Base: #292D34
 */
export function ClickUpThemePage() {
    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                        <Sparkles className="w-10 h-10 text-primary" />
                        ClickUp Theme Demo
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Showcasing shadcn/ui components with ClickUp brand colors
                    </p>
                </div>

                {/* Color Palette */}
                <Card>
                    <CardHeader>
                        <CardTitle>ClickUp Color Palette</CardTitle>
                        <CardDescription>Brand colors and their usage</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Primary Purple */}
                        <div className="space-y-2">
                            <div className="h-24 bg-primary rounded-lg flex items-center justify-center">
                                <span className="text-primary-foreground font-semibold">Primary</span>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">Purple (#7B68EE)</p>
                                <p className="text-muted-foreground">Main brand color</p>
                            </div>
                        </div>

                        {/* Accent Pink */}
                        <div className="space-y-2">
                            <div className="h-24 bg-clickup-pink rounded-lg flex items-center justify-center">
                                <span className="text-white font-semibold">Pink Accent</span>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">Pink (#FD71AF)</p>
                                <p className="text-muted-foreground">Highlights & CTAs</p>
                            </div>
                        </div>

                        {/* Accent Blue */}
                        <div className="space-y-2">
                            <div className="h-24 bg-clickup-blue rounded-lg flex items-center justify-center">
                                <span className="text-white font-semibold">Blue Accent</span>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">Blue (#49CCF9)</p>
                                <p className="text-muted-foreground">Info & links</p>
                            </div>
                        </div>

                        {/* Accent Yellow */}
                        <div className="space-y-2">
                            <div className="h-24 bg-clickup-yellow rounded-lg flex items-center justify-center">
                                <span className="text-black font-semibold">Yellow Accent</span>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">Yellow (#FFC800)</p>
                                <p className="text-muted-foreground">Warnings & alerts</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Buttons */}
                <Card>
                    <CardHeader>
                        <CardTitle>Buttons</CardTitle>
                        <CardDescription>Various button styles with ClickUp colors</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Primary Buttons */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Primary (Purple)</p>
                            <div className="flex flex-wrap gap-2">
                                <Button>Default Button</Button>
                                <Button size="sm">Small Button</Button>
                                <Button size="lg">Large Button</Button>
                                <Button disabled>Disabled</Button>
                            </div>
                        </div>

                        {/* Accent Buttons */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Accent Colors</p>
                            <div className="flex flex-wrap gap-2">
                                <Button className="bg-clickup-pink hover:bg-clickup-pink/90">
                                    <Heart className="w-4 h-4 mr-2" />
                                    Pink Action
                                </Button>
                                <Button className="bg-clickup-blue hover:bg-clickup-blue/90">
                                    <Info className="w-4 h-4 mr-2" />
                                    Blue Info
                                </Button>
                                <Button className="bg-clickup-yellow hover:bg-clickup-yellow/90 text-black">
                                    <Zap className="w-4 h-4 mr-2" />
                                    Yellow Alert
                                </Button>
                            </div>
                        </div>

                        {/* Variants */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Variants</p>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="default">Default</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="destructive">Destructive</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Badges */}
                <Card>
                    <CardHeader>
                        <CardTitle>Badges</CardTitle>
                        <CardDescription>Status badges with ClickUp colors</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        <Badge>Default</Badge>
                        <Badge variant="secondary">Secondary</Badge>
                        <Badge variant="outline">Outline</Badge>
                        <Badge variant="destructive">Destructive</Badge>
                        <Badge className="bg-clickup-pink">Pink Badge</Badge>
                        <Badge className="bg-clickup-blue">Blue Badge</Badge>
                        <Badge className="bg-clickup-yellow text-black">Yellow Badge</Badge>
                    </CardContent>
                </Card>

                {/* Alerts */}
                <Card>
                    <CardHeader>
                        <CardTitle>Alerts</CardTitle>
                        <CardDescription>Alert components with different states</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Default Alert</AlertTitle>
                            <AlertDescription>
                                This is a default alert with information.
                            </AlertDescription>
                        </Alert>

                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error Alert</AlertTitle>
                            <AlertDescription>
                                Something went wrong. Please try again.
                            </AlertDescription>
                        </Alert>

                        <Alert className="border-clickup-blue bg-clickup-blue/10">
                            <CheckCircle2 className="h-4 w-4 text-clickup-blue" />
                            <AlertTitle className="text-clickup-blue">Success!</AlertTitle>
                            <AlertDescription className="text-clickup-blue/80">
                                Your changes have been saved successfully.
                            </AlertDescription>
                        </Alert>

                        <Alert className="border-clickup-yellow bg-clickup-yellow/10">
                            <AlertCircle className="h-4 w-4 text-clickup-yellow" />
                            <AlertTitle className="text-clickup-yellow">Warning</AlertTitle>
                            <AlertDescription className="text-yellow-600 dark:text-yellow-500">
                                This action cannot be undone. Please proceed with caution.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                {/* Form Inputs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Form Inputs</CardTitle>
                        <CardDescription>Input fields with ClickUp styling</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Default Input</label>
                                <Input placeholder="Enter text..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">With Icon</label>
                                <div className="relative">
                                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input placeholder="Search..." className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Disabled</label>
                                <Input placeholder="Disabled input" disabled />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">With Button</label>
                                <div className="flex gap-2">
                                    <Input placeholder="Email address" />
                                    <Button>Subscribe</Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-primary">
                        <CardHeader>
                            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-2">
                                <Sparkles className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <CardTitle>Purple Card</CardTitle>
                            <CardDescription>Primary brand color accent</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                This card uses the primary purple color for emphasis.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-clickup-pink">
                        <CardHeader>
                            <div className="w-12 h-12 bg-clickup-pink rounded-lg flex items-center justify-center mb-2">
                                <Heart className="w-6 h-6 text-white" />
                            </div>
                            <CardTitle>Pink Card</CardTitle>
                            <CardDescription>Pink accent for highlights</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Use pink for important calls-to-action and highlights.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-clickup-blue">
                        <CardHeader>
                            <div className="w-12 h-12 bg-clickup-blue rounded-lg flex items-center justify-center mb-2">
                                <Info className="w-6 h-6 text-white" />
                            </div>
                            <CardTitle>Blue Card</CardTitle>
                            <CardDescription>Blue for information</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Blue accent works great for informational content.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Usage Guide */}
                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="w-5 h-5" />
                            How to Use ClickUp Colors
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="font-medium">Tailwind Classes:</p>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li><code className="bg-muted px-2 py-1 rounded">bg-primary</code> - Primary purple background</li>
                                <li><code className="bg-muted px-2 py-1 rounded">text-primary</code> - Primary purple text</li>
                                <li><code className="bg-muted px-2 py-1 rounded">border-clickup-pink</code> - Pink border</li>
                                <li><code className="bg-muted px-2 py-1 rounded">bg-clickup-blue</code> - Blue background</li>
                                <li><code className="bg-muted px-2 py-1 rounded">text-clickup-yellow</code> - Yellow text</li>
                            </ul>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium">CSS Variables:</p>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li><code className="bg-muted px-2 py-1 rounded">hsl(var(--primary))</code> - Purple</li>
                                <li><code className="bg-muted px-2 py-1 rounded">hsl(var(--accent-pink))</code> - Pink</li>
                                <li><code className="bg-muted px-2 py-1 rounded">hsl(var(--accent-blue))</code> - Blue</li>
                                <li><code className="bg-muted px-2 py-1 rounded">hsl(var(--accent-yellow))</code> - Yellow</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
