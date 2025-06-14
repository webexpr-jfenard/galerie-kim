import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    // Classes de base
    let classes = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ";
    
    // Variantes de style
    switch (variant) {
      case "default":
        classes += "bg-blue-600 text-white hover:bg-blue-700 ";
        break;
      case "destructive":
        classes += "bg-red-600 text-white hover:bg-red-700 ";
        break;
      case "outline":
        classes += "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 ";
        break;
      case "secondary":
        classes += "bg-gray-200 text-gray-900 hover:bg-gray-300 ";
        break;
      case "ghost":
        classes += "text-gray-900 hover:bg-gray-100 ";
        break;
      case "link":
        classes += "text-blue-600 underline-offset-4 hover:underline ";
        break;
    }
    
    // Tailles
    switch (size) {
      case "default":
        classes += "h-9 px-4 py-2 ";
        break;
      case "sm":
        classes += "h-8 px-3 py-1 ";
        break;
      case "lg":
        classes += "h-10 px-6 py-2 ";
        break;
      case "icon":
        classes += "h-9 w-9 ";
        break;
    }
    
    // Ajouter les classes personnalisées
    classes += className;
    
    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
