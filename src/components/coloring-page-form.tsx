'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Upload,
    X,
    Loader2,
    Lock,
    LockOpen,
    RectangleVertical,
    RectangleHorizontal,
    Palette,
    Users,
    Type
} from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

export type ColoringPageFormData = {
    prompt: string;
    imageFiles: File[];
    theme: string;
    customObjects: string;
    names: string;
    hasMindfulBackground: boolean;
    size: '1024x1536' | '1536x1024'; // portrait or landscape
};

type ColoringPageFormProps = {
    onSubmit: (data: ColoringPageFormData) => void;
    isLoading: boolean;
    isPasswordRequiredByBackend: boolean | null;
    clientPasswordHash: string | null;
    onOpenPasswordDialog: () => void;
    imageFiles: File[];
    sourceImagePreviewUrls: string[];
    setImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
    setSourceImagePreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
    maxImages: number;
};

const THEME_OPTIONS = [
    { value: 'garden', label: 'Garden/Nature' },
    { value: 'playground', label: 'Playground' },
    { value: 'beach', label: 'Beach/Ocean' },
    { value: 'forest', label: 'Forest/Woods' },
    { value: 'farm', label: 'Farm/Countryside' },
    { value: 'home', label: 'Home/Indoor' },
    { value: 'custom', label: 'Custom Scene' }
];

export function ColoringPageForm({
    onSubmit,
    isLoading,
    isPasswordRequiredByBackend,
    clientPasswordHash,
    onOpenPasswordDialog,
    imageFiles,
    sourceImagePreviewUrls,
    setImageFiles,
    setSourceImagePreviewUrls,
    maxImages
}: ColoringPageFormProps) {
    const [theme, setTheme] = React.useState<string>('garden');
    const [customObjects, setCustomObjects] = React.useState<string>('');
    const [names, setNames] = React.useState<string>('');
    const [hasMindfulBackground, setHasMindfulBackground] = React.useState<boolean>(false);
    const [size, setSize] = React.useState<'1024x1536' | '1536x1024'>('1024x1536');

    const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            const totalFiles = imageFiles.length + newFiles.length;

            if (totalFiles > maxImages) {
                alert(`You can only select up to ${maxImages} images.`);
                const allowedNewFiles = newFiles.slice(0, maxImages - imageFiles.length);
                if (allowedNewFiles.length === 0) {
                    event.target.value = '';
                    return;
                }
                newFiles.splice(allowedNewFiles.length);
            }

            setImageFiles((prevFiles: File[]) => [...prevFiles, ...newFiles]);

            const newFilePromises = newFiles.map((file) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(newFilePromises)
                .then((newUrls) => {
                    setSourceImagePreviewUrls((prevUrls: string[]) => [...prevUrls, ...newUrls]);
                })
                .catch((error) => {
                    console.error('Error reading new image files:', error);
                });

            event.target.value = '';
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setImageFiles((prevFiles: File[]) => prevFiles.filter((_: File, index: number) => index !== indexToRemove));
        setSourceImagePreviewUrls((prevUrls: string[]) => prevUrls.filter((_: string, index: number) => index !== indexToRemove));
    };

    const buildColoringPagePrompt = (): string => {
        let prompt = "Transform the attached family photos into simple line drawings suitable for a coloring page for young children. Maintain recognizable facial features with clear, bold outlines.";
        
        // Add theme/setting
        if (theme === 'custom') {
            if (customObjects.trim()) {
                prompt += ` Set the scene with ${customObjects.trim()}.`;
            }
        } else {
            const themeLabel = THEME_OPTIONS.find(opt => opt.value === theme)?.label || 'garden';
            prompt += ` Set the scene in a ${themeLabel.toLowerCase()} setting.`;
            
            // Add custom objects if specified
            if (customObjects.trim()) {
                prompt += ` Include ${customObjects.trim()} in the scene.`;
            }
        }
        
        // Add mindful background if enabled
        if (hasMindfulBackground) {
            prompt += " Include an abstract mindful pattern background with geometric or mandala designs that won't interfere with the main subjects.";
        }
        
        // Add names if specified
        if (names.trim()) {
            prompt += ` Add the names '${names.trim()}' as white text with black outlines positioned prominently in the foreground.`;
        }
        
        // Add final styling instructions
        prompt += " All elements should be simple, child-friendly line art perfect for coloring with crayons or markers.";
        
        return prompt;
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (imageFiles.length === 0) {
            alert('Please upload at least one family photo.');
            return;
        }

        const formData: ColoringPageFormData = {
            prompt: buildColoringPagePrompt(),
            imageFiles,
            theme,
            customObjects,
            names,
            hasMindfulBackground,
            size
        };
        onSubmit(formData);
    };

    // const displayFileNames = (files: File[]) => {
    //     if (files.length === 0) return 'No photos selected';
    //     if (files.length === 1) return files[0].name;
    //     return `${files.length} photos selected`;
    // };

    return (
        <Card className='flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-black'>
            <CardHeader className='border-b border-white/10 pb-4'>
                <div className='flex items-center justify-between'>
                    <div>
                        <div className='flex items-center'>
                            <Palette className='mr-2 h-5 w-5 text-white' />
                            <CardTitle className='py-1 text-lg font-medium text-white'>Coloring Page Creator</CardTitle>
                            {isPasswordRequiredByBackend && (
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={onOpenPasswordDialog}
                                    className='ml-2 text-white/60 hover:text-white'
                                    aria-label='Configure Password'>
                                    {clientPasswordHash ? <Lock className='h-4 w-4' /> : <LockOpen className='h-4 w-4' />}
                                </Button>
                            )}
                        </div>
                        <CardDescription className='mt-1 text-white/60'>
                            Transform family photos into personalized coloring pages for children
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <form onSubmit={handleSubmit} className='flex h-full flex-1 flex-col overflow-hidden'>
                <CardContent className='flex-1 space-y-6 overflow-y-auto p-4'>
                    {/* Photo Upload Section */}
                    <div className='space-y-3'>
                        <div className='flex items-center gap-2'>
                            <Users className='h-4 w-4 text-white/60' />
                            <Label className='text-white font-medium'>Family Photos</Label>
                        </div>
                        <Label
                            htmlFor='image-files-input'
                            className='flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-black/50 transition-colors hover:bg-white/5'>
                            <Upload className='h-8 w-8 text-white/40 mb-2' />
                            <span className='text-sm text-white/60'>Click to upload family photos</span>
                            <span className='text-xs text-white/40'>PNG, JPEG, WebP (max {maxImages} photos)</span>
                        </Label>
                        <Input
                            id='image-files-input'
                            type='file'
                            accept='image/png, image/jpeg, image/webp'
                            multiple
                            onChange={handleImageFileChange}
                            disabled={isLoading || imageFiles.length >= maxImages}
                            className='sr-only'
                        />
                        
                        {sourceImagePreviewUrls.length > 0 && (
                            <div className='flex flex-wrap gap-2 pt-2'>
                                {sourceImagePreviewUrls.map((url, index) => (
                                    <div key={url} className='relative'>
                                        <Image
                                            src={url}
                                            alt={`Family photo ${index + 1}`}
                                            width={80}
                                            height={80}
                                            className='rounded border border-white/10 object-cover'
                                            unoptimized
                                        />
                                        <Button
                                            type='button'
                                            variant='destructive'
                                            size='icon'
                                            className='absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-600 p-0.5 text-white hover:bg-red-700'
                                            onClick={() => handleRemoveImage(index)}
                                            aria-label={`Remove photo ${index + 1}`}>
                                            <X className='h-3 w-3' />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Scene Customization */}
                    <div className='space-y-4'>
                        <Label className='text-white font-medium'>Scene & Theme</Label>
                        
                        <div className='space-y-2'>
                            <Label htmlFor='theme-select' className='text-sm text-white/80'>Setting</Label>
                            <Select value={theme} onValueChange={setTheme} disabled={isLoading}>
                                <SelectTrigger className='border-white/20 bg-black text-white'>
                                    <SelectValue placeholder='Choose a setting' />
                                </SelectTrigger>
                                <SelectContent className='border-white/20 bg-black text-white'>
                                    {THEME_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='custom-objects' className='text-sm text-white/80'>
                                Add Objects (optional)
                            </Label>
                            <Textarea
                                id='custom-objects'
                                placeholder='e.g., ducks and dandelions, butterflies, balloons, toys...'
                                value={customObjects}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomObjects(e.target.value)}
                                disabled={isLoading}
                                className='min-h-[60px] border-white/20 bg-black text-white placeholder:text-white/40'
                            />
                        </div>

                        <div className='flex items-center space-x-2'>
                            <Checkbox
                                id='mindful-background'
                                checked={hasMindfulBackground}
                                onCheckedChange={(checked: boolean) => setHasMindfulBackground(checked)}
                                disabled={isLoading}
                                className='border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-black'
                            />
                            <Label htmlFor='mindful-background' className='text-sm text-white/80'>
                                Add mindful background pattern for extra coloring
                            </Label>
                        </div>
                    </div>

                    {/* Names Section */}
                    <div className='space-y-3'>
                        <div className='flex items-center gap-2'>
                            <Type className='h-4 w-4 text-white/60' />
                            <Label className='text-white font-medium'>Names (optional)</Label>
                        </div>
                        <div className='space-y-2'>
                            <Textarea
                                id='names'
                                placeholder='e.g., Emma, Jack, Mom, Dad'
                                value={names}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNames(e.target.value)}
                                disabled={isLoading}
                                className='min-h-[60px] border-white/20 bg-black text-white placeholder:text-white/40'
                            />
                            <p className='text-xs text-white/50'>
                                Names will appear as white text with black outlines, perfect for coloring
                            </p>
                        </div>
                    </div>

                    {/* Size Selection */}
                    <div className='space-y-3'>
                        <Label className='text-white font-medium'>Page Size</Label>
                        <div className='flex gap-3'>
                            <Button
                                type='button'
                                variant={size === '1024x1536' ? 'default' : 'outline'}
                                size='sm'
                                onClick={() => setSize('1024x1536')}
                                disabled={isLoading}
                                className={size === '1024x1536' 
                                    ? 'bg-white text-black hover:bg-white/90' 
                                    : 'border-white/20 text-white/80 hover:bg-white/10'
                                }>
                                <RectangleVertical className='mr-2 h-4 w-4' />
                                Portrait
                            </Button>
                            <Button
                                type='button'
                                variant={size === '1536x1024' ? 'default' : 'outline'}
                                size='sm'
                                onClick={() => setSize('1536x1024')}
                                disabled={isLoading}
                                className={size === '1536x1024' 
                                    ? 'bg-white text-black hover:bg-white/90' 
                                    : 'border-white/20 text-white/80 hover:bg-white/10'
                                }>
                                <RectangleHorizontal className='mr-2 h-4 w-4' />
                                Landscape
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className='border-t border-white/10 p-4'>
                    <Button
                        type='submit'
                        disabled={isLoading || imageFiles.length === 0}
                        className='flex w-full items-center justify-center gap-2 rounded-md bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40'>
                        {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
                        {isLoading ? 'Creating Coloring Page...' : 'Create Coloring Page'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
