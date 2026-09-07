import React, { useState } from 'react';

export default function App() {
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState<boolean>(false);

  const operations: { [key: string]: (a: number, b: number) => number } = {
    '/': (prevValue, nextValue) => prevValue / nextValue,
    '*': (prevValue, nextValue) => prevValue * nextValue,
    '+': (prevValue, nextValue) => prevValue + nextValue,
    '-': (prevValue, nextValue) => prevValue - nextValue,
  };

  const inputDigit = (digit: string) => {
    if (waitingForSecondOperand) {
      setDisplayValue(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplayValue(displayValue === '0' && digit !== '.' ? digit : displayValue + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForSecondOperand) {
      setDisplayValue('0.');
      setWaitingForSecondOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const inputOperator = (nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (operator) {
      const result = operations[operator](firstOperand, inputValue);
      setDisplayValue(String(result));
      setFirstOperand(result);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };

  const handleSquareRoot = () => {
    const inputValue = parseFloat(displayValue);
    if (inputValue < 0) {
      setDisplayValue('Error');
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(true);
      return;
    }
    const result = Math.sqrt(inputValue);
    setDisplayValue(String(result));
    setWaitingForSecondOperand(true);
  };

  const handlePercentage = () => {
    const inputValue = parseFloat(displayValue);
    const result = inputValue / 100;
    setDisplayValue(String(result));
    setWaitingForSecondOperand(true);
  };

  const handleEquals = () => {
    const inputValue = parseFloat(displayValue);

    if (firstOperand !== null && operator) {
      const result = operations[operator](firstOperand, inputValue);
      setDisplayValue(String(result));
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(true);
    }
  };

  const clearDisplay = () => {
    setDisplayValue('0');
  };

  const clearAll = () => {
    setDisplayValue('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };

  const renderButton = (label: string, className: string = '', onClick: () => void) => (
    <button
      type="button"
      className={`flex items-center justify-center p-4 text-2xl font-semibold rounded-lg transition-colors duration-200 ${className}`}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-6">
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-zinc-200">
        {/* Display */}
        <div className="bg-zinc-800 text-white text-right p-5 mb-4 rounded-xl text-5xl font-light overflow-hidden break-all h-24 flex items-end justify-end">
          {displayValue}
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-3">
          {/* Row 1 */}
          {renderButton('AC', 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300', clearAll)}
          {renderButton('C', 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300', clearDisplay)}
          {renderButton('√', 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300', handleSquareRoot)}
          {renderButton('%', 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300', handlePercentage)}

          {/* Row 2 */}
          {renderButton('7', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', () => inputDigit('7'))}
          {renderButton('8', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', () => inputDigit('8'))}
          {renderButton('9', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', () => inputDigit('9'))}
          {renderButton('/', 'bg-purple-500 text-white hover:bg-purple-600', () => inputOperator('/'))}

          {/* Row 3 */}
          {renderButton('4', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', () => inputDigit('4'))}
          {renderButton('5', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', () => inputDigit('5'))}
          {renderButton('6', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', () => inputDigit('6'))}
          {renderButton('*', 'bg-purple-500 text-white hover:bg-purple-600', () => inputOperator('*'))}

          {/* Row 4 */}
          {renderButton('1', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', () => inputDigit('1'))}
          {renderButton('2', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', () => inputDigit('2'))}
          {renderButton('3', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', () => inputDigit('3'))}
          {renderButton('-', 'bg-purple-500 text-white hover:bg-purple-600', () => inputOperator('-'))}

          {/* Row 5 */}
          {renderButton('0', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 col-span-2', () => inputDigit('0'))}
          {renderButton('.', 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200', inputDecimal)}
          {renderButton('+', 'bg-purple-500 text-white hover:bg-purple-600', () => inputOperator('+'))}

          {/* Row 6 */}
          {renderButton('=', 'bg-indigo-500 text-white hover:bg-indigo-600 col-span-4', handleEquals)}
        </div>
      </div>
    </div>
  );
}
