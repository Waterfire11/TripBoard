"use client";

import { useState, useEffect } from "react";
import { useGetBoards, useExpenses } from "@/features/boards/hooks";
import BudgetSummary from "@/components/budget/BudgetSummary";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AddExpenseForm from "@/components/budget/ExpenseForm";
import Link from "next/link";

export default function BudgetPage() {
  const { data: boards = [], isLoading: boardsLoading } = useGetBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  useEffect(() => {
    if (boards.length > 0 && selectedBoardId === null) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(selectedBoardId || 0);

  if (boardsLoading) return <div aria-live="polite">Loading boards...</div>;
  if (boards.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6" aria-live="polite">
        <h1 className="text-3xl font-bold mb-6">Budget Tracker</h1>
        <p>No boards available. <Link href="/boards?create=true" className="text-blue-600 hover:underline">Create a board</Link> to start tracking expenses.</p>
      </div>
    );
  }

  const handleAddExpenseSuccess = () => {
    setShowAddExpense(false);
    toast.success("Expense added successfully");
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Budget Tracker</h1>
      
      {/* Board Selector */}
      <div className="mb-6">
        <Select
          value={selectedBoardId?.toString() || ""}
          onValueChange={(value) => setSelectedBoardId(parseInt(value))}
          aria-label="Select a board"
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select a board" />
          </SelectTrigger>
          <SelectContent>
            {boards.map((board) => (
              <SelectItem key={board.id} value={board.id.toString()}>
                {board.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBoardId && (
        <>
          <BudgetSummary 
            boardId={selectedBoardId}
            onAddExpense={() => setShowAddExpense(true)} 
            onViewAll={() => setShowAllExpenses(true)} 
          />

          {/* Add Expense Modal */}
          <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <AddExpenseForm boardId={selectedBoardId} onSuccess={handleAddExpenseSuccess} />
            </DialogContent>
          </Dialog>

          {/* View All Expenses Modal */}
          <Dialog open={showAllExpenses} onOpenChange={setShowAllExpenses}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>All Expenses</DialogTitle>
              </DialogHeader>
              {expensesLoading ? (
                <div aria-live="polite">Loading expenses...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.title}</TableCell>
                        <TableCell>{expense.amount} {expense.currency}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.date || 'N/A'}</TableCell>
                        <TableCell>{expense.notes || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                    {expenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No expenses yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}