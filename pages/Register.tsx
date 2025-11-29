import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { Button, Input, Card } from '../components/UI';
import { Link, useNavigate } from 'react-router-dom';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
    } else {
      // Create profile entry
      // Note: In a real app, a Trigger in Supabase DB is better for this.
      navigate('/');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto mt-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-600">AssetFlow</h1>
        <p className="text-gray-500">Start your journey to financial freedom</p>
      </div>
      <Card className="p-8">
        <h2 className="text-xl font-semibold mb-6">Create Account</h2>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input 
            label="Email" 
            type="email" 
            {...register('email')} 
            error={errors.email?.message} 
          />
          <Input 
            label="Password" 
            type="password" 
            {...register('password')} 
            error={errors.password?.message} 
          />
          <Input 
            label="Confirm Password" 
            type="password" 
            {...register('confirmPassword')} 
            error={errors.confirmPassword?.message} 
          />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign Up
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Log in</Link>
        </p>
      </Card>
    </div>
  );
};

export default Register;