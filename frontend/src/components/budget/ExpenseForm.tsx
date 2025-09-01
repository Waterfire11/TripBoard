import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateExpense } from "@/features/boards/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

const expenseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places").refine(
    (val) => parseFloat(val) <= 99999999.99,
    "Amount must not exceed 99,999,999.99"
  ),
  category: z.enum(['travel', 'lodging', 'food', 'activities', 'fees', 'misc']),
  date: z.string().optional(),
  notes: z.string().max(1000, "Notes must be 1000 characters or less").optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseFormProps {
  boardId: number;
  onSuccess: () => void;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ boardId, onSuccess }) => {
  const { mutate: createExpense, isPending } = useCreateExpense(boardId);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      amount: "",
      category: "misc",
      date: "",
      notes: "",
    },
  });

  const onSubmit = (data: ExpenseFormValues) => {
    createExpense(data, {
      onSuccess: onSuccess,
      onError: (error) => toast.error(`Failed to add expense: ${error.message}`),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-label="Add Expense Form">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} aria-required="true" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="text" {...field} aria-required="true" placeholder="0.00" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} aria-required="true">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="travel">Travel/Flight</SelectItem>
                  <SelectItem value="lodging">Lodging</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="activities">Activities</SelectItem>
                  <SelectItem value="fees">Fees</SelectItem>
                  <SelectItem value="misc">Misc</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} aria-label={isPending ? "Adding expense" : "Add expense"}>
          {isPending ? "Adding..." : "Add Expense"}
        </Button>
      </form>
    </Form>
  );
};

export default AddExpenseForm;