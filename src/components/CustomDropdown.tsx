import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string | number;
  onChange: (value: any) => void;
  disabled?: boolean;
  variant?: "dark" | "cream";
  icon?: React.ReactNode;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  variant = "dark",
  icon,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string | number) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`custom-dropdown-container ${variant} ${disabled ? "disabled" : ""} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? "open" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {icon && <span className="dropdown-trigger-icon">{icon}</span>}
          <span className="dropdown-trigger-label truncate font-bold">{selectedOption?.label}</span>
          {selectedOption?.sublabel && (
            <span className="dropdown-trigger-sublabel text-xs opacity-75">
              {selectedOption.sublabel}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`dropdown-chevron-icon transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div className="custom-dropdown-popover">
          <div className="custom-dropdown-menu-scroll">
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value}
                  className={`custom-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="dropdown-item-label font-bold">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="dropdown-item-sublabel text-xs opacity-70">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {opt.badge && <span className="nav-pill pill-coral ml-1 text-xs">{opt.badge}</span>}
                  </div>
                  {isSelected && <Check size={14} className="dropdown-item-check" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

