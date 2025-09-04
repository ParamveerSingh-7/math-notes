import type React from "react";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import {
  Calculator,
  Palette,
  RotateCcw,
  Play,
  Loader2,
  Move,
  Maximize2,
  History,
  Copy,
  ChevronRight,
  ChevronDown,
  Star,
  StarOff,
  Trash2,
  FileText,
  ImageIcon,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
@@ .. @@
  const [selectedResults, setSelectedResults] = useState<Set<string>>(
    new Set()
  );

  // Mock calculation function to simulate backend
  const mockCalculate = async (imageData: string): Promise<Response[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock responses for demonstration
    const mockResponses: Response[] = [
      {
        expr: "2 + 3 × 4",
        result: "14",
        assign: false,
        steps: [
          "Apply PEMDAS rule - multiplication first",
          "Calculate 3 × 4 = 12", 
          "Add 2 + 12 = 14"
        ]
      }
    ];
    
    return mockResponses;
  };

   useEffect(() => {
     if (latexExpressions.length > 0 && window.MathJax) {
@@ .. @@
     setIsCalculating(true);
    try {
      // Use mock calculation instead of backend API
      const mockData = await mockCalculate(canvas.toDataURL("image/png"));
      
      const resp = {
        data: mockData,
        message: "Image processed",
        status: "success"
      };
      
      const newResults: GeneratedResult[] = [];
      const timestamp = Date.now();

      resp.data.forEach((data: Response, index: number) => {
        if (data.assign === true) {
          setDictOfVars({
@@ -318,40 +278,12 @@ export default function MathCalculator() {
        const resultId = `${timestamp}-${index}`;

        // Use steps from mock data if available
        let steps: string[] = [];
        if (showSteps && data.steps) {
          steps = data.steps;
        }

        const newResult: GeneratedResult = {
          id: resultId,