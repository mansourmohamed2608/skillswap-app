import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export type ButtonProps = TouchableOpacityProps & {
	children: React.ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
};

export default function Button({ children, variant = 'default', size = 'default', className, ...rest }: ButtonProps) {
	// Map web variants to RN class sets
	const v = variant === 'primary' ? 'default' : variant; // alias
	const base = 'rounded-md active:opacity-90 items-center justify-center';
	const sizeCls: Record<ButtonSize, string> = {
		default: 'h-10 px-4 py-2',
		sm: 'h-9 px-3',
		lg: 'h-11 px-8',
		icon: 'h-10 w-10 items-center justify-center',
	};
	const bgCls: Record<Exclude<ButtonVariant, 'primary'>, string> = {
		default: 'bg-primary',
		destructive: 'bg-destructive',
		outline: 'border border-input bg-background',
		secondary: 'bg-secondary',
		ghost: 'bg-transparent',
		link: 'bg-transparent',
	} as const;
	const textCls: Record<Exclude<ButtonVariant, 'primary'>, string> = {
		default: 'text-primary-foreground',
		destructive: 'text-destructive-foreground',
		outline: 'text-foreground',
		secondary: 'text-secondary-foreground',
		ghost: 'text-foreground',
		link: 'text-primary underline',
	} as const;
	const container = `${base} ${sizeCls[size]} ${bgCls[v as Exclude<ButtonVariant,'primary'>]} ${className ?? ''}`.trim();
	const text = `font-medium ${textCls[v as Exclude<ButtonVariant,'primary'>]}`.trim();
	const renderChildren = () => {
		if (typeof children === 'string' || typeof children === 'number') {
			return <Text style={cn(text)}>{children}</Text>;
		}
		return children;
	};

	return (
		<TouchableOpacity {...rest} style={cn(container)}>
			{renderChildren()}
		</TouchableOpacity>
	);
}
