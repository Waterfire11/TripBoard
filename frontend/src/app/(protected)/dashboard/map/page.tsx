"use client";

import { useState, useMemo } from "react";
import { useGetBoards } from "@/features/boards/hooks";
import BoardMap from "@/components/map/BoardMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

export default function MapPage() {
  const { data: boards = [], isLoading: boardsLoading } = useGetBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

  // Set default to first board
  useMemo(() => {
    if (boards.length > 0 && selectedBoardId === null) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  if (boardsLoading) return <div aria-live="polite">Loading boards...</div>;
  if (boards.length === 0) {
    return (
      <div className="p-6" aria-live="polite">
        <h1 className="text-3xl font-bold mb-6">Trip Map</h1>
        <p>No boards available. <Link href="/boards?create=true" className="text-blue-600 hover:underline">Create a board</Link> to add locations.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trip Map</h1>
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
      {selectedBoardId && <BoardMap boardId={selectedBoardId} />}
    </div>
  );
}