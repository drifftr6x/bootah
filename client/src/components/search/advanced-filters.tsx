import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Filter, X, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface FilterOption {
  key: string;
  label: string;
  type: "select" | "date" | "text";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ActiveFilter {
  key: string;
  value: string;
  label: string;
  displayValue: string;
}

interface AdvancedFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterOptions: FilterOption[];
  activeFilters: ActiveFilter[];
  onFilterChange: (filters: ActiveFilter[]) => void;
  placeholder?: string;
}

export default function AdvancedFilters({
  searchTerm,
  onSearchChange,
  filterOptions,
  activeFilters,
  onFilterChange,
  placeholder = "Search...",
}: AdvancedFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const addFilter = (option: FilterOption, value: string, displayValue?: string) => {
    if (!value) return;

    const filter: ActiveFilter = {
      key: option.key,
      value,
      label: option.label,
      displayValue: displayValue || value,
    };

    const newFilters = activeFilters.filter(f => f.key !== option.key);
    newFilters.push(filter);
    onFilterChange(newFilters);
    setTempFilters(prev => ({ ...prev, [option.key]: "" }));
  };

  const removeFilter = (key: string) => {
    const newFilters = activeFilters.filter(f => f.key !== key);
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange([]);
    setTempFilters({});
    setDateRange({});
  };

  const renderFilterInput = (option: FilterOption) => {
    switch (option.type) {
      case "select":
        return (
          <Select
            value={tempFilters[option.key] || ""}
            onValueChange={(value) => {
              const selectedOption = option.options?.find(opt => opt.value === value);
              if (selectedOption) {
                addFilter(option, value, selectedOption.label);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={option.placeholder || `Select ${option.label}`} />
            </SelectTrigger>
            <SelectContent>
              {option.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "text":
        return (
          <div className="flex space-x-2">
            <Input
              placeholder={option.placeholder || `Enter ${option.label}`}
              value={tempFilters[option.key] || ""}
              onChange={(e) => setTempFilters(prev => ({ ...prev, [option.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tempFilters[option.key]) {
                  addFilter(option, tempFilters[option.key]);
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => tempFilters[option.key] && addFilter(option, tempFilters[option.key])}
              disabled={!tempFilters[option.key]}
            >
              Add
            </Button>
          </div>
        );

      case "date":
        return (
          <div className="flex space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, "PPP") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, "PPP") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button
              size="sm"
              onClick={() => {
                if (dateRange.from && dateRange.to) {
                  const rangeStr = `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`;
                  addFilter(option, `${dateRange.from.toISOString()}|${dateRange.to.toISOString()}`, rangeStr);
                  setDateRange({});
                }
              }}
              disabled={!dateRange.from || !dateRange.to}
            >
              Add
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-main-search"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center space-x-2",
            activeFilters.length > 0 && "bg-blue-50 border-blue-200 text-blue-700"
          )}
          data-testid="button-toggle-filters"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeFilters.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilters.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={`${filter.key}-${filter.value}`}
              variant="secondary"
              className="flex items-center space-x-1"
              data-testid={`active-filter-${filter.key}`}
            >
              <span className="text-xs">
                {filter.label}: {filter.displayValue}
              </span>
              <button
                onClick={() => removeFilter(filter.key)}
                className="ml-1 hover:text-destructive"
                data-testid={`remove-filter-${filter.key}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-clear-filters"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="border rounded-lg p-4 bg-muted/30" data-testid="filter-panel">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterOptions.map((option) => (
              <div key={option.key} className="space-y-2">
                <Label className="text-sm font-medium">{option.label}</Label>
                {renderFilterInput(option)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}