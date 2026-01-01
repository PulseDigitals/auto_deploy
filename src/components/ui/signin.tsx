import { forwardRef, useCallback } from "react";
import { type VariantProps } from "class-variance-authority";
import { LogIn } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button.tsx";
import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";

export interface SignInButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick">,
    VariantProps<typeof buttonVariants> {
  /**
   * Custom onClick handler that runs before authentication action
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Whether to show icons in the button
   * @default true
   */
  showIcon?: boolean;
  /**
   * Custom text for sign in state
   * @default "Sign In"
   */
  signInText?: string;
  /**
   * Custom text for sign out state
   * @default "Sign Out"
   */
  signOutText?: string;
  /**
   * Custom text for loading state
   * @default "Signing In..." or "Signing Out..."
   */
  loadingText?: string;
  /**
   * Whether to use the asChild pattern
   * @default false
   */
  asChild?: boolean;
}

/**
 * A button component that handles authentication sign in/out with proper loading states
 * and accessibility features.
 */
export const SignInButton = forwardRef<HTMLButtonElement, SignInButtonProps>(
  (
    {
      onClick,
      disabled,
      showIcon = true,
      signInText = "Sign In",
      signOutText = "Sign Out",
      loadingText,
      className,
      variant,
      size,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const { redirectToSignIn, signOut } = useClerk();
    const { isSignedIn } = useClerkAuth();

    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        // Run custom onClick first
        onClick?.(event);

        const returnTo = "/dashboard/projects";

        if (!isSignedIn) {
          redirectToSignIn({ redirectUrl: returnTo });
        } else {
          await signOut();
        }
      },
      [onClick, isSignedIn, redirectToSignIn, signOut],
    );

    const isDisabled = disabled;
    const buttonText = isSignedIn ? signOutText || "Sign Out" : signInText || "Sign In";
    const icon = <LogIn className="size-4" />;

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={className}
        asChild={asChild}
        aria-label={
          "Sign in to your account"
        }
        {...props}
      >
        {showIcon && icon}
        {buttonText}
      </Button>
    );
  },
);

SignInButton.displayName = "SignInButton";
