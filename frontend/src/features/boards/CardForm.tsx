import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCreateCard, useUpdateCard, useCreateLocation, useUpdateLocation } from './hooks';
import { toast } from 'sonner';
import { useState } from 'react';

const cardSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  budget: z.string().optional().refine(val => !val || /^\d+(\.\d{1,2})?$/.test(val), 'Valid amount'),
  people_number: z.number().min(1).optional(),
  tags: z.array(z.string()).optional(),
  due_date: z.string().optional(),
  subtasks: z.array(z.object({ title: z.string(), completed: z.boolean() })).optional(),
  location: z.object({ name: z.string(), lat: z.number(), lng: z.number() }).optional(),
  category: z.enum(['flight', 'hotel', 'food', 'activity', 'romantic', 'family']).optional(),
});

type CardFormData = z.infer<typeof cardSchema>;

interface CardFormProps {
  boardId: number;
  listId: number;
  onSuccess: () => void;
  initialData?: Partial<CardFormData> & { id?: number; locationId?: number };
}

export default function CardForm({ boardId, listId, onSuccess, initialData }: CardFormProps) {
  const [address, setAddress] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, getValues, watch } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      budget: initialData?.budget || '0.00',
      people_number: initialData?.people_number || 1,
      tags: initialData?.tags || [],
      due_date: initialData?.due_date || '',
      subtasks: initialData?.subtasks || [],
      location: initialData?.location || undefined,
      category: initialData?.category || undefined,
    },
  });

  const { mutate: createCard } = useCreateCard(boardId, listId);
  const { mutate: updateCard } = useUpdateCard(boardId, listId);
  const { mutate: createLocation } = useCreateLocation(boardId);
  const { mutate: updateLocation } = useUpdateLocation();

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setValue('location', { name: address, lat, lng });
        toast.success('Location added');
      } else {
        toast.error('Address not found');
      }
    } catch (error) {
      toast.error('Geocoding failed');
    } finally {
      setIsGeocoding(false);
    }
  };

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    const subtasks = getValues('subtasks') || [];
    setValue('subtasks', [...subtasks, { title: subtaskInput, completed: false }]);
    setSubtaskInput('');
  };

  const onSubmit: SubmitHandler<CardFormData> = (data) => {
    const cardData = { ...data };
    delete cardData.location;

    const handleLocation = (cardId: number, location?: CardFormData['location']) => {
      if (location) {
        if (initialData?.locationId) {
          updateLocation({ locationId: initialData.locationId, data: { ...location, board: boardId }, boardId });
        } else {
          createLocation({ ...location, board: boardId }, {
            onSuccess: () => toast.success('Location synced to map'),
          });
        }
      }
    };

    if (initialData?.id) {
      updateCard({ cardId: initialData.id, data: cardData }, { 
        onSuccess: (updatedCard) => {
          handleLocation(updatedCard.id, data.location);
          onSuccess();
        },
      });
    } else {
      createCard(cardData, { 
        onSuccess: (newCard) => {
          handleLocation(newCard.id, data.location);
          onSuccess();
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-y-auto border border-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div>
            <Label htmlFor="title" className="block text-sm font-bold text-gray-800">Title</Label>
            <Input id="title" {...register('title')} className="border-gray-300 shadow-sm focus:border-blue-500 bg-white text-gray-900" />
            {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
          </div>
          <div>
            <Label htmlFor="description" className="block text-sm font-bold text-gray-800">Description</Label>
            <Textarea id="description" {...register('description')} className="border-gray-300 shadow-sm focus:border-blue-500 bg-white text-gray-900" />
          </div>
          <div>
            <Label htmlFor="budget" className="block text-sm font-bold text-gray-800">Budget</Label>
            <Input id="budget" {...register('budget')} type="text" className="border-gray-300 shadow-sm focus:border-blue-500 bg-white text-gray-900" />
            {errors.budget && <p className="text-red-500 text-sm">{errors.budget.message}</p>}
          </div>
          <div>
            <Label htmlFor="people_number" className="block text-sm font-bold text-gray-800">Number of People</Label>
            <Input id="people_number" {...register('people_number', { valueAsNumber: true })} type="number" className="border-gray-300 shadow-sm focus:border-blue-500 bg-white text-gray-900" />
            {errors.people_number && <p className="text-red-500 text-sm">{errors.people_number.message}</p>}
          </div>
          <div>
            <Label htmlFor="tags" className="block text-sm font-bold text-gray-800">Tags (comma separated)</Label>
            <Input id="tags" onChange={(e) => setValue('tags', e.target.value.split(',').map(t => t.trim()))} className="border-gray-300 shadow-sm focus:border-blue-500 bg-white text-gray-900" />
          </div>
          <div>
            <Label htmlFor="due_date" className="block text-sm font-bold text-gray-800">Due Date</Label>
            <Input id="due_date" {...register('due_date')} type="date" className="border-gray-300 shadow-sm focus:border-blue-500 bg-white text-gray-900" />
          </div>
          <div>
            <Label className="block text-sm font-bold text-gray-800">Category</Label>
            <Select onValueChange={(val) => setValue('category', val as any)}>
              <SelectTrigger className="border-gray-300 shadow-sm focus:border-blue-500 bg-white text-gray-900">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flight">Flight</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="romantic">Romantic</SelectItem>
                <SelectItem value="family">Family</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block text-sm font-bold text-gray-800">Subtasks</Label>
            <div className="space-y-2">
              {watch('subtasks')?.map((st, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox className="border-gray-500" checked={st.completed} onCheckedChange={(checked) => {
                    const subtasks = [...(watch('subtasks') || [])];
                    subtasks[i].completed = !!checked;
                    setValue('subtasks', subtasks);
                  }} />
                  <span className="text-gray-800">{st.title}</span>
                </div>
              ))}
              <Input placeholder="New subtask" value={subtaskInput} onChange={(e) => setSubtaskInput(e.target.value)} className="border-gray-300 shadow-sm focus:border-blue-500 bg-white text-gray-900" />
              <Button type="button" onClick={addSubtask} className="bg-blue-600 text-white transition-none">Add Subtask</Button>
            </div>
          </div>
          <div>
            <Label className="block text-sm font-bold text-gray-800">Location</Label>
            <Input placeholder="Enter address" value={address} onChange={(e) => setAddress(e.target.value)} className="border-gray-300 shadow-sm focus:border-blue-500 bg-white text-gray-900" />
            <Button type="button" onClick={handleGeocode} disabled={isGeocoding} className="bg-blue-600 text-white mt-2 transition-none">
              {isGeocoding ? 'Searching...' : 'Find Location'}
            </Button>
            {watch('location') && <p className="text-gray-800 mt-2">Location: {watch('location')?.name} ({watch('location')?.lat}, {watch('location')?.lng})</p>}
          </div>
          <Button type="submit" className="bg-blue-600 text-white w-full transition-none">Save Card</Button>
        </form>
      </div>
    </div>
  );
}