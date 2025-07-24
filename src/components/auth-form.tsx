'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, LogIn } from 'lucide-react';
import * as React from 'react';

type AuthFormProps = {
  mode: 'login' | 'signup';
  onToggleMode: () => void;
  onSuccess: (user: { id: string; email: string; name?: string; creditsRemaining: number; isTrialActive: boolean }) => void;
};

export function AuthForm({ mode, onToggleMode, onSuccess }: AuthFormProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body = mode === 'login' 
        ? { email, password }
        : { email, password, name };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-white/10 bg-black">
      <CardHeader className="text-center">
        <CardTitle className="text-white flex items-center justify-center gap-2">
          {mode === 'login' ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </CardTitle>
        <CardDescription className="text-white/60">
          {mode === 'login' 
            ? 'Sign in to your coloring page account'
            : 'Get 3 free coloring pages to start your 7-day trial'
          }
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-500/50 bg-red-900/20 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="border-white/20 bg-black text-white placeholder:text-white/40"
                placeholder="Your name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="border-white/20 bg-black text-white placeholder:text-white/40"
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={isLoading}
              className="border-white/20 bg-black text-white placeholder:text-white/40"
              placeholder="At least 6 characters"
            />
          </div>

          {mode === 'signup' && (
            <div className="text-xs text-white/60 bg-blue-900/20 border border-blue-500/30 rounded p-3">
              <strong>Free Trial:</strong> Get 3 free coloring pages immediately. 
              Your trial will automatically convert to a paid plan after 7 days unless you cancel.
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Start Free Trial'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onToggleMode}
            disabled={isLoading}
            className="w-full text-white/60 hover:text-white hover:bg-white/10"
          >
            {mode === 'login' 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
