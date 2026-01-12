import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  AssetFilters,
  COLOR_OPTIONS,
  ColorKey,
  RatioKey,
  clearFilters,
  isFiltersEmpty,
  toggleSetValue,
} from "./filters";

interface AssetFiltersBarProps {
  value: AssetFilters;
  onChange: (next: AssetFilters) => void;
  onClear?: () => void;
}

export function AssetFiltersBar({ value, onChange, onClear }: AssetFiltersBarProps) {
  const { colors, ratios, favoritesOnly } = value;
  const ratioSet = ratios ?? new Set<RatioKey>();

  const toggleColor = (c: ColorKey) => {
    onChange({
      ...value,
      colors: toggleSetValue(colors, c),
    });
  };

  const toggleRatio = (r: RatioKey) => {
    const next = toggleSetValue(ratioSet, r);
    onChange({
      ...value,
      ratios: next.size > 0 ? (next as Set<RatioKey>) : undefined,
    });
  };

  const toggleFavorites = () => {
    onChange({
      ...value,
      favoritesOnly: !favoritesOnly,
    });
  };

  const clearAll = () => {
    if (onClear) return onClear();
    onChange(clearFilters());
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        {!isFiltersEmpty(value) && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Reset
          </Button>
        )}
      </div>

      <Separator />

      <Accordion type="multiple" defaultValue={["type", "usage", "people", "orientation", "color"]} className="w-full">
        {/* Type */}
        <AccordionItem value="type">
          <AccordionTrigger>Asset type</AccordionTrigger>
          <AccordionContent>
            <ToggleGroup type="single" value="all" className="grid grid-cols-2 gap-2">
              {["All assets", "Photos", "Vectors", "Illustrations", "3D objects", "AI-generated"].map((label, i) => (
                <ToggleGroupItem key={label} value={label} disabled={i !== 0} className="h-10">
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </AccordionContent>
        </AccordionItem>

        {/* Usage */}
        <AccordionItem value="usage">
          <AccordionTrigger>Usage</AccordionTrigger>
          <AccordionContent>
            <ToggleGroup type="single" className="grid grid-cols-2 gap-2">
              {["Editorial only", "Non-editorial"].map((label) => (
                <ToggleGroupItem key={label} value={label} disabled className="h-10">
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </AccordionContent>
        </AccordionItem>

        {/* People */}
        <AccordionItem value="people">
          <AccordionTrigger>People</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <ToggleGroup type="single" className="grid grid-cols-2 gap-2">
              {["With people", "Without people"].map((label) => (
                <ToggleGroupItem key={label} value={label} disabled className="h-10">
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="space-y-2">
              {["Age", "Gender", "Number of people", "Ethnicity"].map((label) => (
                <Button key={label} variant="ghost" disabled className="w-full justify-between">
                  {label}
                  <span className="text-muted-foreground">▾</span>
                </Button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Orientation */}
        <AccordionItem value="orientation">
          <AccordionTrigger>Orientation</AccordionTrigger>
          <AccordionContent>
            <ToggleGroup
              type="single"
              value={value.orientation}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  orientation: v ? (v as any) : undefined,
                })
              }
              className="grid grid-cols-2 gap-2"
            >
              <ToggleGroupItem value="landscape" className="h-10">
                Landscape
              </ToggleGroupItem>
              <ToggleGroupItem value="portrait" className="h-10">
                Portrait
              </ToggleGroupItem>
            </ToggleGroup>
          </AccordionContent>
        </AccordionItem>

        {/* Color */}
        <AccordionItem value="color">
          <AccordionTrigger>Color</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onChange({ ...value, colors: new Set() })}
                aria-label="Clear colors"
              >
                ×
              </Button>

              {COLOR_OPTIONS.map((c) => {
                const active = colors.has(c.key);
                return (
                  <Button
                    key={c.key}
                    variant={active ? "default" : "outline"}
                    size="icon"
                    onClick={() => toggleColor(c.key)}
                    className={c.swatch}
                    aria-pressed={active}
                    title={c.label}
                  />
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Aspect ratio</div>
              <ToggleGroup type="multiple" className="grid grid-cols-2 gap-2">
                {(["1/1", "16/9", "4/3", "3/4"] as const).map((r) => {
                  const active = ratioSet.has(r);
                  return (
                    <ToggleGroupItem
                      key={r}
                      value={r}
                      aria-pressed={active}
                      onClick={() => toggleRatio(r)}
                      className="h-10"
                    >
                      {r}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>

            <Button
              variant={favoritesOnly ? "default" : "outline"}
              onClick={toggleFavorites}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                ⭐ Favorites
              </span>
              <Badge variant="secondary">Only</Badge>
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
