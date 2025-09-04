"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
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

interface GeneratedResult {
  expression: string;
  answer: string;
  steps?: string[];
  timestamp: number;
  id: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
  steps?: string[];
}

interface Position {
  x: number;
  y: number;
}

interface HistoryItem {
  id: string;
  expression: string;
  answer: string;
  steps?: string[];
  timestamp: number;
  isFavorite: boolean;
  canvasData?: string;
}

declare global {
  interface Window {
    MathJax: {
      Hub: {
        Config: (config: { tex2jax: { inlineMath: string[][] } }) => void;
        Queue: (commands: Array<string | typeof window.MathJax.Hub>) => void;
      };
    };
  }
}

const SWATCHES = [
  { color: "rgb(255,255,255)", name: "White" },
  { color: "rgb(255,99,132)", name: "Red" },
  { color: "rgb(54,162,235)", name: "Blue" },
  { color: "rgb(255,205,86)", name: "Yellow" },
  { color: "rgb(75,192,192)", name: "Teal" },
  { color: "rgb(153,102,255)", name: "Purple" },
  { color: "rgb(255,159,64)", name: "Orange" },
];

export default function MathCalculator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [latexPosition, setLatexPosition] = useState<Position>({
    x: 10,
    y: 200,
  });
  const [latexExpressions, setLatexExpressions] = useState<Array<string>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isCalculating, setIsCalculating] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [hasStartedDrawing, setHasStartedDrawing] = useState(false);

  // New state for enhanced features
  const [showSteps, setShowSteps] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [selectedResults, setSelectedResults] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (latexExpressions.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpressions]);

  useEffect(() => {
    if (results.length > 0) {
      renderLatexToCanvas(results);
    }
  }, [results]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpressions([]);
      setResults([]);
      setDictOfVars({});
      setReset(false);
      setSelectedResults(new Set());
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const updateCanvasSize = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = 3;
        }
        setCanvasSize({ width: rect.width, height: rect.height });
      };

      updateCanvasSize();
      window.addEventListener("resize", updateCanvasSize);

      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        window.MathJax.Hub.Config({
          tex2jax: {
            inlineMath: [
              ["$", "$"],
              ["$$", "$$"],
            ],
          },
        });
      };

      // Load history from localStorage
      const savedHistory = localStorage.getItem("math-calculator-history");
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Error loading history:", e);
        }
      }

      return () => {
        window.removeEventListener("resize", updateCanvasSize);
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("math-calculator-history", JSON.stringify(history));
  }, [history]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - latexPosition.x,
      y: e.clientY - latexPosition.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setLatexPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const renderLatexToCanvas = (results: GeneratedResult[]) => {
    const latexArray = results.map(
      (result) => `$$\\LARGE{${result.expression}=${result.answer}}$$`
    );
    setLatexExpressions(latexArray);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Don't clear the canvas here to preserve the drawing
      }
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasStartedDrawing(false);
    }
  };

  const getEventPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const pos = getEventPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
        setHasStartedDrawing(true);
      }
    }
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const pos = getEventPos(e);
        ctx.strokeStyle = color;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Enhanced function to parse steps from AI response
  const parseStepsFromResponse = (responseText: string): string[] => {
    const steps: string[] = [];

    // Try to extract steps from various formats the AI might use
    const stepPatterns = [
      /Step \d+[:.]\s*(.+?)(?=Step \d+|$)/gi,
      /\d+\.\s*(.+?)(?=\d+\.|$)/gi,
      /→\s*(.+?)(?=→|$)/gi,
      /First[,:]?\s*(.+?)(?=Second|Next|Then|Finally|$)/gi,
      /Second[,:]?\s*(.+?)(?=Third|Next|Then|Finally|$)/gi,
      /Third[,:]?\s*(.+?)(?=Fourth|Next|Then|Finally|$)/gi,
      /Then[,:]?\s*(.+?)(?=Next|Finally|$)/gi,
      /Finally[,:]?\s*(.+?)$/gi,
    ];

    for (const pattern of stepPatterns) {
      const matches = responseText.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim()) {
          steps.push(match[1].trim());
        }
      }
      if (steps.length > 0) break;
    }

    // If no structured steps found, try to split by common delimiters
    if (steps.length === 0) {
      const lines = responseText
        .split(/[.\n]/)
        .filter(
          (line) =>
            line.trim().length > 10 &&
            !line.includes("expr") &&
            !line.includes("result") &&
            !line.includes("{") &&
            !line.includes("}")
        );
      steps.push(...lines.map((line) => line.trim()).slice(0, 5));
    }

    return steps.filter((step) => step.length > 0);
  };

  const runRoute = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsCalculating(true);
    try {
      // Create enhanced prompt for step-by-step solutions
      const basePrompt = `You have been given an image with some mathematical expressions, equations, or graphical problems, and you need to solve them.

Note: Use the PEMDAS rule for solving mathematical expressions. PEMDAS stands for the Priority Order: Parentheses, Exponents, Multiplication and Division (from left to right), Addition and Subtraction (from left to right). Parentheses have the highest priority, followed by Exponents, then Multiplication and Division, and lastly Addition and Subtraction.

For example:
Q. 2 + 3 * 4
(3 * 4) => 12, 2 + 12 = 14.
Q. 2 + 3 + 5 * 4 - 8 / 2
5 * 4 => 20, 8 / 2 => 4, 2 + 3 => 5, 5 + 20 => 25, 25 - 4 => 21.

YOU CAN HAVE FIVE TYPES OF EQUATIONS/EXPRESSIONS IN THIS IMAGE, AND ONLY ONE CASE SHALL APPLY EVERY TIME:
Following are the cases:
1. Simple mathematical expressions like 2 + 2, 3 * 4, 5 / 6, 7 - 8, etc.: In this case, solve and return the answer in the format of a LIST OF ONE DICT [{'expr': given expression, 'result': calculated answer}].
2. Set of Equations like x^2 + 2x + 1 = 0, 3y + 4x = 0, 5x^2 + 6y + 7 = 12, etc.: In this case, solve for the given variable, and the format should be a COMMA SEPARATED LIST OF DICTS, with dict 1 as {'expr': 'x', 'result': 2, 'assign': True} and dict 2 as {'expr': 'y', 'result': 5, 'assign': True}. This example assumes x was calculated as 2, and y as 5. Include as many dicts as there are variables.
3. Assigning values to variables like x = 4, y = 5, z = 6, etc.: In this case, assign values to variables and return another key in the dict called {'assign': True}, keeping the variable as 'expr' and the value as 'result' in the original dictionary. RETURN AS A LIST OF DICTS.
4. Analyzing Graphical Math problems, which are word problems represented in drawing form, such as cars colliding, trigonometric problems, problems on the Pythagorean theorem, adding runs from a cricket wagon wheel, etc. These will have a drawing representing some scenario and accompanying information with the image. PAY CLOSE ATTENTION TO DIFFERENT COLORS FOR THESE PROBLEMS. You need to return the answer in the format of a LIST OF ONE DICT [{'expr': given expression, 'result': calculated answer}].
5. Detecting Abstract Concepts that a drawing might show, such as love, hate, jealousy, patriotism, or a historic reference to war, invention, discovery, quote, etc. USE THE SAME FORMAT AS OTHERS TO RETURN THE ANSWER, where 'expr' will be the explanation of the drawing, and 'result' will be the abstract concept.

${
  showSteps
    ? `
IMPORTANT: STEP-BY-STEP SOLUTION REQUESTED
For each mathematical expression or equation you solve, provide detailed step-by-step working. Include each step of the calculation process clearly. For example:

For 2 + 3 * 4:
Step 1: Apply PEMDAS rule - multiplication first
Step 2: Calculate 3 * 4 = 12
Step 3: Add 2 + 12 = 14

For quadratic equations like x^2 + 2x + 1 = 0:
Step 1: Identify this as a quadratic equation in standard form
Step 2: Try factoring: (x + 1)^2 = 0
Step 3: Solve: x + 1 = 0
Step 4: Therefore x = -1

Include these step-by-step explanations BEFORE your final answer in the required dictionary format. Write the steps clearly and number them.
`
    : ""
}

Analyze the equation or expression in this image and return the answer according to the given rules:
Make sure to use extra backslashes for escape characters like \\f -> \\\\f, \\n -> \\\\n, etc.
Here is a dictionary of user-assigned variables. If the given expression has any of these variables, use its actual value from this dictionary accordingly: ${JSON.stringify(
        dictOfVars,
        null,
        2
      )}.
DO NOT USE BACKTICKS OR MARKDOWN FORMATTING.
PROPERLY QUOTE THE KEYS AND VALUES IN THE DICTIONARY FOR EASIER PARSING WITH Python's ast.literal_eval.`;

      const response = await axios({
        method: "post",
        url: `${import.meta.env.VITE_API_URL}/calculate`,
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
          custom_prompt: basePrompt, // Send our enhanced prompt
        },
      });

      const resp = await response.data;
      const newResults: GeneratedResult[] = [];
      const timestamp = Date.now();

      // Parse the full response text to extract steps if step mode is enabled
      let fullResponseText = "";
      if (resp.raw_response) {
        fullResponseText = resp.raw_response;
      } else if (typeof resp === "string") {
        fullResponseText = resp;
      } else if (resp.text) {
        fullResponseText = resp.text;
      }

      resp.data.forEach((data: Response, index: number) => {
        if (data.assign === true) {
          setDictOfVars({
            ...dictOfVars,
            [data.expr]: data.result,
          });
        }

        const resultId = `${timestamp}-${index}`;

        // Extract steps from the full response if step mode is enabled
        let steps: string[] = [];
        if (showSteps && fullResponseText) {
          steps = parseStepsFromResponse(fullResponseText);

          // If we couldn't parse steps from the response, create basic steps
          if (steps.length === 0) {
            // Generate basic steps based on the expression type
            const expr = data.expr.toString();
            const result = data.result.toString();

            if (
              expr.includes("+") ||
              expr.includes("-") ||
              expr.includes("*") ||
              expr.includes("/")
            ) {
              steps = [
                `Identify the mathematical expression: ${expr}`,
                `Apply order of operations (PEMDAS)`,
                `Calculate the result: ${result}`,
              ];
            } else if (expr.includes("=") && expr.includes("x")) {
              steps = [
                `Identify the equation: ${expr}`,
                `Isolate the variable`,
                `Solve for x: ${result}`,
              ];
            } else {
              steps = [
                `Analyze the expression: ${expr}`,
                `Compute the final result: ${result}`,
              ];
            }
          }
        }

        const newResult: GeneratedResult = {
          id: resultId,
          expression: data.expr,
          answer: data.result,
          steps: showSteps ? steps : undefined,
          timestamp,
        };
        newResults.push(newResult);
      });

      // Calculate canvas drawing bounds for positioning
      const ctx = canvas.getContext("2d");
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (imageData.data[i + 3] > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      setLatexPosition({ x: centerX, y: centerY });

      setTimeout(() => {
        setResults(newResults);

        // Add to history
        const historyItems: HistoryItem[] = newResults.map((result) => ({
          id: result.id,
          expression: result.expression,
          answer: result.answer,
          steps: result.steps,
          timestamp: result.timestamp,
          isFavorite: false,
          canvasData: canvas.toDataURL("image/png"),
        }));

        setHistory((prev) => [...historyItems, ...prev]);
      }, 1000);
    } catch (error) {
      console.error("Calculation error:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const toggleStepExpansion = (resultId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedSteps(newExpanded);
  };

  const toggleFavorite = (id: string) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const loadFromHistory = (item: HistoryItem) => {
    if (item.canvasData) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.drawImage(img, 0, 0);
        };
        img.src = item.canvasData;
      }
    }

    const result: GeneratedResult = {
      id: item.id,
      expression: item.expression,
      answer: item.answer,
      steps: item.steps,
      timestamp: item.timestamp,
    };
    setResults([result]);
    setShowHistory(false);
  };

  const downloadCanvas = (format: "png" | "pdf") => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (format === "png") {
      const link = document.createElement("a");
      link.download = `math-canvas-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } else if (format === "pdf") {
      // For PDF, we'll create a simple implementation
      // In a real app, you'd use a library like jsPDF
      const dataURL = canvas.toDataURL();
      const link = document.createElement("a");
      link.download = `math-canvas-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  const copyLatex = () => {
    const latexCode = results
      .map((result) => `${result.expression} = ${result.answer}`)
      .join("\n");

    navigator.clipboard.writeText(latexCode).then(() => {
      // You could add a toast notification here
      console.log("LaTeX copied to clipboard");
    });
  };

  const exportResults = () => {
    const exportData = {
      results,
      timestamp: Date.now(),
      canvasData: canvasRef.current?.toDataURL(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `math-results-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(156, 146, 172, 0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      ></div>

      {/* History Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-black/40 backdrop-blur-xl border-r border-white/20 z-50 transform transition-transform duration-300 ${
          showHistory ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">History</h2>
            </div>
            <Button
              onClick={() => setShowHistory(false)}
              className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20"
              variant="ghost"
            >
              <X className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center text-white/60 py-8">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No calculations yet</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {item.expression} = {item.answer}
                    </p>
                    <p className="text-xs text-white/60">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      onClick={() => toggleFavorite(item.id)}
                      className="h-6 w-6 p-0 bg-transparent hover:bg-white/10"
                      variant="ghost"
                    >
                      {item.isFavorite ? (
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      ) : (
                        <StarOff className="w-3 h-3 text-white/60" />
                      )}
                    </Button>
                    <Button
                      onClick={() => deleteHistoryItem(item.id)}
                      className="h-6 w-6 p-0 bg-transparent hover:bg-red-500/20"
                      variant="ghost"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </Button>
                  </div>
                </div>

                {item.steps && item.steps.length > 0 && (
                  <div className="mb-2">
                    <Button
                      onClick={() => toggleStepExpansion(item.id)}
                      className="h-6 px-2 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300"
                      variant="ghost"
                    >
                      {expandedSteps.has(item.id) ? (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Hide Steps
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3 h-3 mr-1" />
                          Show Steps ({item.steps.length})
                        </>
                      )}
                    </Button>

                    {expandedSteps.has(item.id) && (
                      <div className="mt-2 space-y-1">
                        {item.steps.map((step, index) => (
                          <div
                            key={index}
                            className="text-xs text-white/80 bg-white/5 rounded px-2 py-1"
                          >
                            {index + 1}. {step}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => loadFromHistory(item)}
                  className="w-full h-7 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300"
                  variant="ghost"
                >
                  Load
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Math Canvas</h1>
              <p className="text-sm text-white/70">
                Draw expressions, get instant solutions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              AI Powered
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* History Toggle */}
          <Button
            onClick={() => setShowHistory(!showHistory)}
            className="h-12 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:scale-105"
            variant="ghost"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>

          {/* Step-by-Step Toggle */}
          <Button
            onClick={() => setShowSteps(!showSteps)}
            className={`h-12 px-4 backdrop-blur-sm border transition-all duration-300 hover:scale-105 ${
              showSteps
                ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
            }`}
            variant="ghost"
          >
            {showSteps ? (
              <Eye className="w-4 h-4 mr-2" />
            ) : (
              <EyeOff className="w-4 h-4 mr-2" />
            )}
            Show Steps
          </Button>

          {/* Color Palette Toggle */}
          <div className="relative">
            <Button
              onClick={() => setShowColorPalette(!showColorPalette)}
              className="h-12 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:scale-105"
              variant="ghost"
            >
              <Palette className="w-4 h-4 mr-2" />
              Colors
            </Button>

            {showColorPalette && (
              <div className="absolute top-14 left-0 p-4 bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-20 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-white/70" />
                  <span className="text-sm font-medium text-white/90">
                    Drawing Colors
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SWATCHES.map((swatch) => (
                    <button
                      key={swatch.color}
                      onClick={() => {
                        setColor(swatch.color);
                        setShowColorPalette(false);
                      }}
                      className={`w-8 h-8 rounded-lg shadow-lg transition-all duration-200 hover:scale-110 border-2 ${
                        color === swatch.color
                          ? "border-white/70 ring-2 ring-white/30"
                          : "border-white/20 hover:border-white/40"
                      }`}
                      style={{ backgroundColor: swatch.color }}
                      title={swatch.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <Button
            onClick={() => setReset(true)}
            className="h-12 px-4 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm border border-red-500/30 text-red-300 hover:text-red-200 transition-all duration-300 hover:scale-105"
            variant="ghost"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          {/* Calculate Button */}
          <Button
            onClick={runRoute}
            disabled={isCalculating}
            className="h-12 px-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 backdrop-blur-sm border border-blue-500/30 text-blue-300 hover:text-blue-200 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            variant="ghost"
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {showSteps ? "Calculating Steps..." : "Calculating..."}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Calculate
              </>
            )}
          </Button>

          {/* Export Options */}
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => downloadCanvas("png")}
                className="h-12 px-4 bg-green-500/20 hover:bg-green-500/30 backdrop-blur-sm border border-green-500/30 text-green-300 transition-all duration-300 hover:scale-105"
                variant="ghost"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                PNG
              </Button>

              <Button
                onClick={copyLatex}
                className="h-12 px-4 bg-orange-500/20 hover:bg-orange-500/30 backdrop-blur-sm border border-orange-500/30 text-orange-300 transition-all duration-300 hover:scale-105"
                variant="ghost"
              >
                <Copy className="w-4 h-4 mr-2" />
                LaTeX
              </Button>

              <Button
                onClick={exportResults}
                className="h-12 px-4 bg-purple-500/20 hover:bg-purple-500/30 backdrop-blur-sm border border-purple-500/30 text-purple-300 transition-all duration-300 hover:scale-105"
                variant="ghost"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          )}

          {/* Canvas Info */}
          <div className="ml-auto hidden md:flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
            <Maximize2 className="w-4 h-4 text-white/50" />
            <span className="text-xs text-white/70">
              {canvasSize.width} × {canvasSize.height}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        className={`relative flex-1 mx-4 md:mx-6 mb-6 transition-all duration-300 ${
          showHistory ? "ml-84" : ""
        }`}
      >
        <div className="relative h-[calc(100vh-200px)] bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Canvas Grid Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            style={{ background: "transparent" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {/* Drawing Instructions */}
          {latexExpressions.length === 0 && !hasStartedDrawing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <Calculator className="w-8 h-8 text-white/50" />
                </div>
                <h3 className="text-lg font-semibold text-white/80 mb-2">
                  Start Drawing
                </h3>
                <p className="text-sm text-white/60 max-w-xs">
                  Draw mathematical expressions on the canvas and click
                  Calculate to solve them
                </p>
                {showSteps && (
                  <div className="mt-3 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full inline-block">
                    <p className="text-xs text-blue-300">
                      ✨ Step-by-step mode enabled
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LaTeX Results - Enhanced for Multiple Expressions */}
      {results.map((result, index) => (
        <div
          key={result.id}
          className="absolute z-30 group"
          style={{
            left: latexPosition.x + index * 20,
            top: latexPosition.y + index * 60,
            userSelect: "none",
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="relative p-4 bg-black/60 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl cursor-move transition-all duration-200 hover:bg-black/70 hover:scale-105 max-w-md">
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-6 h-6 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-full flex items-center justify-center">
                <Move className="w-3 h-3 text-blue-300" />
              </div>
            </div>

            <div className="latex-content text-white text-lg mb-2">
              {`$$\\LARGE{${result.expression}=${result.answer}}$$`}
            </div>

            {/* Step-by-step solution */}
            {showSteps && result.steps && result.steps.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <Button
                  onClick={() => toggleStepExpansion(result.id)}
                  className="h-6 px-2 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 mb-2"
                  variant="ghost"
                >
                  {expandedSteps.has(result.id) ? (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Hide Steps
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-3 h-3 mr-1" />
                      Show Steps ({result.steps.length})
                    </>
                  )}
                </Button>

                {expandedSteps.has(result.id) && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {result.steps.map((step, stepIndex) => (
                      <div
                        key={stepIndex}
                        className="text-sm text-white/80 bg-white/10 rounded px-3 py-2"
                      >
                        <span className="text-blue-300 font-medium">
                          Step {stepIndex + 1}:
                        </span>{" "}
                        {step}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Loading Overlay */}
      {isCalculating && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="p-8 bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                <div className="absolute inset-0 w-12 h-12 border-2 border-blue-400/20 rounded-full animate-pulse"></div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Processing Expression
                </h3>
                <p className="text-sm text-white/70">
                  AI is analyzing your drawing
                  {showSteps ? " and generating detailed steps" : ""}...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Overlay */}
      {showHistory && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
