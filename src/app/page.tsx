'use client';

import { AuthForm } from '@/components/auth-form';
import { ColoringPageForm, type ColoringPageFormData } from '@/components/coloring-page-form';
import { HistoryPanel } from '@/components/history-panel';
import { ImageOutput } from '@/components/image-output';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { calculateApiCost, type CostDetails } from '@/lib/cost-utils';
import { db, type ImageRecord } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { LogOut, User, CreditCard } from 'lucide-react';
import * as React from 'react';

type HistoryImage = {
    filename: string;
};

export type HistoryMetadata = {
    timestamp: number;
    images: HistoryImage[];
    storageModeUsed?: 'fs' | 'indexeddb' | 'supabase';
    durationMs: number;
    prompt: string;
    mode: 'coloring-page';
    costDetails: CostDetails | null;
    theme?: string;
    customObjects?: string;
    names?: string;
    hasMindfulBackground?: boolean;
    size?: '1024x1536' | '1536x1024';
};

type User = {
    id: string;
    email: string;
    name?: string;
    creditsRemaining: number;
    isTrialActive: boolean;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
};

const MAX_EDIT_IMAGES = 10;

        // Using Supabase Storage for all image handling
        const effectiveStorageModeClient = 'supabase';

type ApiImageResponseItem = {
    filename: string;
    b64_json?: string;
    output_format: string;
    path?: string;
};

export default function HomePage() {
    const [user, setUser] = React.useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = React.useState(true);
    const [authMode, setAuthMode] = React.useState<'login' | 'signup'>('signup');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSendingToEdit, setIsSendingToEdit] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [latestImageBatch, setLatestImageBatch] = React.useState<{ path: string; filename: string }[] | null>(null);
    const [imageOutputView, setImageOutputView] = React.useState<'grid' | number>('grid');
    const [history, setHistory] = React.useState<HistoryMetadata[]>([]);
    const [isInitialLoad, setIsInitialLoad] = React.useState(true);
    const [blobUrlCache, setBlobUrlCache] = React.useState<Record<string, string>>({});
    const [skipDeleteConfirmation, setSkipDeleteConfirmation] = React.useState<boolean>(false);
    const [itemToDeleteConfirm, setItemToDeleteConfirm] = React.useState<HistoryMetadata | null>(null);
    const [dialogCheckboxStateSkipConfirm, setDialogCheckboxStateSkipConfirm] = React.useState<boolean>(false);

    const allDbImages = useLiveQuery<ImageRecord[] | undefined>(() => db.images.toArray(), []);

    const [imageFiles, setImageFiles] = React.useState<File[]>([]);
    const [sourceImagePreviewUrls, setSourceImagePreviewUrls] = React.useState<string[]>([]);

    // Check authentication status on mount
    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            } finally {
                setIsAuthLoading(false);
            }
        };

        checkAuth();
    }, []);

    const getImageSrc = React.useCallback(
        (filename: string): string | undefined => {
            if (blobUrlCache[filename]) {
                return blobUrlCache[filename];
            }

            const record = allDbImages?.find((img) => img.filename === filename);
            if (record?.blob) {
                const url = URL.createObjectURL(record.blob);
                return url;
            }

            return undefined;
        },
        [allDbImages, blobUrlCache]
    );

    React.useEffect(() => {
        return () => {
            Object.values(blobUrlCache).forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [blobUrlCache]);

    React.useEffect(() => {
        return () => {
            sourceImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [sourceImagePreviewUrls]);

    React.useEffect(() => {
        if (!user) return;
        
        try {
            const storedHistory = localStorage.getItem(`openaiImageHistory_${user.id}`);
            if (storedHistory) {
                const parsedHistory: HistoryMetadata[] = JSON.parse(storedHistory);
                if (Array.isArray(parsedHistory)) {
                    setHistory(parsedHistory);
                } else {
                    console.warn('Invalid history data found in localStorage.');
                    localStorage.removeItem(`openaiImageHistory_${user.id}`);
                }
            }
        } catch (e) {
            console.error('Failed to load or parse history from localStorage:', e);
            localStorage.removeItem(`openaiImageHistory_${user.id}`);
        }
        setIsInitialLoad(false);
    }, [user]);

    React.useEffect(() => {
        if (!isInitialLoad && user) {
            try {
                localStorage.setItem(`openaiImageHistory_${user.id}`, JSON.stringify(history));
            } catch (e) {
                console.error('Failed to save history to localStorage:', e);
            }
        }
    }, [history, isInitialLoad, user]);

    React.useEffect(() => {
        const storedPref = localStorage.getItem('imageGenSkipDeleteConfirm');
        if (storedPref === 'true') {
            setSkipDeleteConfirmation(true);
        } else if (storedPref === 'false') {
            setSkipDeleteConfirmation(false);
        }
    }, []);

    React.useEffect(() => {
        localStorage.setItem('imageGenSkipDeleteConfirm', String(skipDeleteConfirmation));
    }, [skipDeleteConfirmation]);

    React.useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            if (!event.clipboardData || !user) {
                return;
            }

            if (imageFiles.length >= MAX_EDIT_IMAGES) {
                alert(`Cannot paste: Maximum of ${MAX_EDIT_IMAGES} images reached.`);
                return;
            }

            const items = event.clipboardData.items;
            let imageFound = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        event.preventDefault();
                        imageFound = true;

                        const previewUrl = URL.createObjectURL(file);

                        setImageFiles((prevFiles: File[]) => [...prevFiles, file]);
                        setSourceImagePreviewUrls((prevUrls: string[]) => [...prevUrls, previewUrl]);

                        console.log('Pasted image added:', file.name);
                        break;
                    }
                }
            }
            if (!imageFound) {
                console.log('Paste event did not contain a recognized image file.');
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [imageFiles.length, user]);

    const handleAuthSuccess = (userData: User) => {
        setUser(userData);
        setError(null);
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            setHistory([]);
            setLatestImageBatch(null);
            setImageFiles([]);
            setSourceImagePreviewUrls([]);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // const getMimeTypeFromFormat = (format: string): string => {
    //     if (format === 'jpeg') return 'image/jpeg';
    //     if (format === 'webp') return 'image/webp';
    //     return 'image/png';
    // };

    const handleApiCall = async (formData: ColoringPageFormData) => {
        if (!user) {
            setError('Please log in to create coloring pages');
            return;
        }

        if (user.creditsRemaining <= 0) {
            setError('No credits remaining. Please upgrade your plan to continue.');
            return;
        }

        const startTime = Date.now();
        let durationMs = 0;

        setIsLoading(true);
        setError(null);
        setLatestImageBatch(null);
        setImageOutputView('grid');

        const apiFormData = new FormData();
        apiFormData.append('mode', 'edit');
        apiFormData.append('prompt', formData.prompt);
        apiFormData.append('n', '1');
        apiFormData.append('size', formData.size);
        apiFormData.append('quality', 'high');

        formData.imageFiles.forEach((file, index) => {
            apiFormData.append(`image_${index}`, file, file.name);
        });

        try {
            const response = await fetch('/api/images', {
                method: 'POST',
                body: apiFormData
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in to continue');
                    setUser(null);
                    return;
                }
                if (response.status === 403) {
                    setError('No credits remaining. Please upgrade your plan to continue.');
                    // Refresh user data to get updated credit count
                    const userResponse = await fetch('/api/auth/me');
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        setUser(userData.user);
                    }
                    return;
                }
                throw new Error(result.error || `API request failed with status ${response.status}`);
            }

            if (result.images && result.images.length > 0) {
                durationMs = Date.now() - startTime;
                
                // Refresh user data to get updated credit count
                const userResponse = await fetch('/api/auth/me');
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    setUser(userData.user);
                }

                const costDetails = calculateApiCost(result.usage);

                const batchTimestamp = Date.now();
                const newHistoryEntry: HistoryMetadata = {
                    timestamp: batchTimestamp,
                    images: result.images.map((img: { filename: string }) => ({ filename: img.filename })),
                    storageModeUsed: effectiveStorageModeClient,
                    durationMs: durationMs,
                    prompt: formData.prompt,
                    mode: 'coloring-page',
                    costDetails: costDetails,
                    theme: formData.theme,
                    customObjects: formData.customObjects,
                    names: formData.names,
                    hasMindfulBackground: formData.hasMindfulBackground,
                    size: formData.size
                };

                // With Supabase Storage, images are already uploaded and we get public URLs
                const newImageBatchPromises = result.images
                    .filter((img: ApiImageResponseItem) => !!img.path)
                    .map((img: ApiImageResponseItem) =>
                        Promise.resolve({
                            path: img.path!,
                            filename: img.filename
                        })
                    );

                const processedImages = (await Promise.all(newImageBatchPromises)).filter(Boolean) as {
                    path: string;
                    filename: string;
                }[];

                setLatestImageBatch(processedImages);
                setImageOutputView(processedImages.length > 1 ? 'grid' : 0);
                setHistory((prevHistory: HistoryMetadata[]) => [newHistoryEntry, ...prevHistory]);
            } else {
                setLatestImageBatch(null);
                throw new Error('API response did not contain valid image data or filenames.');
            }
        } catch (err: unknown) {
            durationMs = Date.now() - startTime;
            console.error(`API Call Error after ${durationMs}ms:`, err);
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setError(errorMessage);
            setLatestImageBatch(null);
        } finally {
            if (durationMs === 0) durationMs = Date.now() - startTime;
            setIsLoading(false);
        }
    };

    const handleHistorySelect = (item: HistoryMetadata) => {
        const originalStorageMode = item.storageModeUsed || 'fs';

        const selectedBatchPromises = item.images.map(async (imgInfo) => {
            let path: string | undefined;
            if (originalStorageMode === 'indexeddb') {
                path = getImageSrc(imgInfo.filename);
            } else {
                path = `/api/image/${imgInfo.filename}`;
            }

            if (path) {
                return { path, filename: imgInfo.filename };
            } else {
                console.warn(`Could not get image source for history item: ${imgInfo.filename}`);
                setError(`Image ${imgInfo.filename} could not be loaded.`);
                return null;
            }
        });

        Promise.all(selectedBatchPromises).then((resolvedBatch) => {
            const validImages = resolvedBatch.filter(Boolean) as { path: string; filename: string }[];

            if (validImages.length !== item.images.length && !error) {
                setError('Some images from this history entry could not be loaded.');
            } else if (validImages.length === item.images.length) {
                setError(null);
            }

            setLatestImageBatch(validImages.length > 0 ? validImages : null);
            setImageOutputView(validImages.length > 1 ? 'grid' : 0);
        });
    };

    const handleClearHistory = async () => {
        const confirmationMessage = 'Are you sure you want to clear the entire image history? This cannot be undone.';

        if (window.confirm(confirmationMessage)) {
            setHistory([]);
            setLatestImageBatch(null);
            setImageOutputView('grid');
            setError(null);

            try {
                if (user) {
                    localStorage.removeItem(`openaiImageHistory_${user.id}`);
                }

                // No need to clear local storage for Supabase mode
                // Images are stored in Supabase Storage
            } catch (e) {
                console.error('Failed during history clearing:', e);
                setError(`Failed to clear history: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    };

    const handleSendToEdit = async (filename: string) => {
        if (isSendingToEdit) return;
        setIsSendingToEdit(true);
        setError(null);

        const alreadyExists = imageFiles.some((file: File) => file.name === filename);
        if (alreadyExists) {
            setIsSendingToEdit(false);
            return;
        }

        if (imageFiles.length >= MAX_EDIT_IMAGES) {
            setError(`Cannot add more than ${MAX_EDIT_IMAGES} images to the coloring page form.`);
            setIsSendingToEdit(false);
            return;
        }

        try {
            let blob: Blob | undefined;
            let mimeType: string = 'image/png';

            // With Supabase Storage, fetch image from API endpoint
            const response = await fetch(`/api/image/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            blob = await response.blob();
            mimeType = response.headers.get('Content-Type') || mimeType;

            if (!blob) {
                throw new Error(`Could not retrieve image data for ${filename}.`);
            }

            const newFile = new File([blob], filename, { type: mimeType });
            const newPreviewUrl = URL.createObjectURL(blob);

            setImageFiles((prevFiles: File[]) => [...prevFiles, newFile]);
            setSourceImagePreviewUrls((prevUrls: string[]) => [...prevUrls, newPreviewUrl]);
        } catch (err: unknown) {
            console.error('Error adding image to coloring page form:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to add image to coloring page form.';
            setError(errorMessage);
        } finally {
            setIsSendingToEdit(false);
        }
    };

    const executeDeleteItem = async (item: HistoryMetadata) => {
        if (!item) return;
        setError(null);

        const { images: imagesInEntry, storageModeUsed, timestamp } = item;
        const filenamesToDelete = imagesInEntry.map((img) => img.filename);

        try {
            if (storageModeUsed === 'indexeddb') {
                await db.images.where('filename').anyOf(filenamesToDelete).delete();
                setBlobUrlCache((prevCache: Record<string, string>) => {
                    const newCache = { ...prevCache };
                    filenamesToDelete.forEach((fn: string) => delete newCache[fn]);
                    return newCache;
                });
            } else if (storageModeUsed === 'fs') {
                const response = await fetch('/api/image-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filenames: filenamesToDelete })
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || `API deletion failed with status ${response.status}`);
                }
            }

            setHistory((prevHistory: HistoryMetadata[]) => prevHistory.filter((h: HistoryMetadata) => h.timestamp !== timestamp));
            if (latestImageBatch && latestImageBatch.some((img: { path: string; filename: string }) => filenamesToDelete.includes(img.filename))) {
                setLatestImageBatch(null);
            }
        } catch (e: unknown) {
            console.error('Error during item deletion:', e);
            setError(e instanceof Error ? e.message : 'An unexpected error occurred during deletion.');
        } finally {
            setItemToDeleteConfirm(null);
        }
    };

    const handleRequestDeleteItem = (item: HistoryMetadata) => {
        if (!skipDeleteConfirmation) {
            setDialogCheckboxStateSkipConfirm(skipDeleteConfirmation);
            setItemToDeleteConfirm(item);
        } else {
            executeDeleteItem(item);
        }
    };

    const handleConfirmDeletion = () => {
        if (itemToDeleteConfirm) {
            executeDeleteItem(itemToDeleteConfirm);
            setSkipDeleteConfirmation(dialogCheckboxStateSkipConfirm);
        }
    };

    const handleCancelDeletion = () => {
        setItemToDeleteConfirm(null);
    };

    if (isAuthLoading) {
        return (
            <main className='flex min-h-screen items-center justify-center bg-black text-white'>
                <div className='text-center'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4'></div>
                    <p>Loading...</p>
                </div>
            </main>
        );
    }

    if (!user) {
        return (
            <main className='flex min-h-screen items-center justify-center bg-black text-white p-4'>
                <div className='w-full max-w-md'>
                    <div className='text-center mb-8'>
                        <h1 className='text-3xl font-bold mb-2'>Coloring Page Creator</h1>
                        <p className='text-white/60'>Transform your family photos into beautiful coloring pages</p>
                    </div>
                    <AuthForm
                        mode={authMode}
                        onToggleMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                        onSuccess={handleAuthSuccess}
                    />
                </div>
            </main>
        );
    }

    return (
        <main className='flex min-h-screen flex-col items-center bg-black p-4 text-white md:p-8 lg:p-12'>
            <div className='w-full max-w-7xl space-y-6'>
                {/* Header with user info */}
                <div className='flex items-center justify-between border-b border-white/10 pb-4'>
                    <div>
                        <h1 className='text-2xl font-bold'>Coloring Page Creator</h1>
                        <p className='text-white/60'>Transform your family photos into coloring pages</p>
                    </div>
                    <div className='flex items-center gap-4'>
                        <div className='flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2'>
                            <CreditCard className='h-4 w-4' />
                            <span className='font-medium'>
                                {user.creditsRemaining} credit{user.creditsRemaining !== 1 ? 's' : ''} remaining
                            </span>
                            {user.isTrialActive && (
                                <span className='text-xs bg-blue-600 px-2 py-1 rounded'>Trial</span>
                            )}
                        </div>
                        <div className='flex items-center gap-2 text-white/60'>
                            <User className='h-4 w-4' />
                            <span>{user.name || user.email}</span>
                        </div>
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={handleLogout}
                            className='text-white/60 hover:text-white hover:bg-white/10'
                        >
                            <LogOut className='h-4 w-4 mr-2' />
                            Logout
                        </Button>
                    </div>
                </div>

                {user.creditsRemaining <= 0 && (
                    <Alert className='border-orange-500/50 bg-orange-900/20 text-orange-300'>
                        <AlertTitle className='text-orange-200'>No Credits Remaining</AlertTitle>
                        <AlertDescription>
                            You&apos;ve used all your credits. Please upgrade your plan to continue creating coloring pages.
                        </AlertDescription>
                    </Alert>
                )}

                <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                    <div className='relative flex h-[70vh] min-h-[600px] flex-col lg:col-span-1'>
                        <ColoringPageForm
                            onSubmit={handleApiCall}
                            isLoading={isLoading || isSendingToEdit}
                            isPasswordRequiredByBackend={false}
                            clientPasswordHash={null}
                            onOpenPasswordDialog={() => {}}
                            imageFiles={imageFiles}
                            sourceImagePreviewUrls={sourceImagePreviewUrls}
                            setImageFiles={setImageFiles}
                            setSourceImagePreviewUrls={setSourceImagePreviewUrls}
                            maxImages={MAX_EDIT_IMAGES}
                        />
                    </div>
                    <div className='flex h-[70vh] min-h-[600px] flex-col lg:col-span-1'>
                        {error && (
                            <Alert variant='destructive' className='mb-4 border-red-500/50 bg-red-900/20 text-red-300'>
                                <AlertTitle className='text-red-200'>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <ImageOutput
                            imageBatch={latestImageBatch}
                            viewMode={imageOutputView}
                            onViewChange={setImageOutputView}
                            altText='Generated coloring page'
                            isLoading={isLoading || isSendingToEdit}
                            onSendToEdit={handleSendToEdit}
                            currentMode={'coloring-page'}
                            baseImagePreviewUrl={sourceImagePreviewUrls[0] || null}
                        />
                    </div>
                </div>

                <div className='min-h-[450px]'>
                    <HistoryPanel
                        history={history}
                        onSelectImage={handleHistorySelect}
                        onClearHistory={handleClearHistory}
                        getImageSrc={getImageSrc}
                        onDeleteItemRequest={handleRequestDeleteItem}
                        itemPendingDeleteConfirmation={itemToDeleteConfirm}
                        onConfirmDeletion={handleConfirmDeletion}
                        onCancelDeletion={handleCancelDeletion}
                        deletePreferenceDialogValue={dialogCheckboxStateSkipConfirm}
                        onDeletePreferenceDialogChange={setDialogCheckboxStateSkipConfirm}
                    />
                </div>
            </div>
        </main>
    );
}
