import * as React from "react"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, onCheckedChange, onChange, checked, ...props }, ref) => {
        return (
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    ref={ref}
                    checked={checked}
                    onChange={(e) => {
                        onChange?.(e)
                        onCheckedChange?.(e.target.checked)
                    }}
                    {...props}
                />
                <div className={`
          w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/50 
          rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
          peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
          after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
          after:transition-all peer-checked:bg-indigo-600 hover:peer-checked:bg-indigo-500 transition-colors
          ${className}
        `}></div>
            </label>
        )
    }
)
Switch.displayName = "Switch"

export { Switch }
