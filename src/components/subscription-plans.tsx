'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, CreditCard, Star } from 'lucide-react';
import * as React from 'react';

type Plan = {
  id: 'basic' | 'premium';
  name: string;
  price: number;
  credits: number;
  description: string;
  features: string[];
  popular?: boolean;
};

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 5,
    credits: 5,
    description: '5 coloring pages per month',
    features: [
      '5 coloring pages per month',
      'Family photo uploads',
      'Theme selection',
      'Custom objects',
      'Name integration',
      'High-quality PNG output'
    ]
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: 10,
    credits: 12,
    description: '12 coloring pages per month',
    popular: true,
    features: [
      '12 coloring pages per month',
      'Family photo uploads',
      'Theme selection',
      'Custom objects',
      'Name integration',
      'High-quality PNG output',
      'Mindful background patterns',
      'Priority support'
    ]
  }
];

type SubscriptionPlansProps = {
  currentPlan?: string;
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
  error?: string;
};

export function SubscriptionPlans({ currentPlan, onSelectPlan, isLoading, error }: SubscriptionPlansProps) {
  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h2>
        <p className="text-white/60">
          Create personalized coloring pages for your family with our monthly subscription plans
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 border-red-500/50 bg-red-900/20 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative border-white/10 bg-black ${
              plan.popular ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-3 py-1 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-3xl font-bold text-white">${plan.price}</span>
                <span className="text-white/60">/month</span>
              </div>
              <CardDescription className="text-white/60 mt-2">
                {plan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-white/80 text-sm">{feature}</span>
                </div>
              ))}
            </CardContent>

            <CardFooter className="pt-4">
              {currentPlan === plan.id ? (
                <Button 
                  disabled 
                  className="w-full bg-green-600 text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Current Plan
                </Button>
              ) : (
                <Button
                  onClick={() => onSelectPlan(plan.id)}
                  disabled={isLoading}
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {currentPlan ? 'Switch Plan' : 'Start 7-Day Trial'}
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 max-w-2xl mx-auto">
          <h3 className="text-white font-medium mb-2">🎉 7-Day Free Trial</h3>
          <p className="text-white/70 text-sm">
            Start with any plan and get a full 7-day free trial. Your subscription will begin after the trial period. 
            Cancel anytime during the trial with no charges.
          </p>
        </div>
      </div>
    </div>
  );
}
