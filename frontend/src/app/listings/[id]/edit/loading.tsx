import { Skeleton } from '@/components/ui/skeleton';

function FormFieldSkeleton({ labelWidth = 'w-24' }: { labelWidth?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

export default function EditListingLoading() {
  return (
    <div className="container mx-auto max-w-4xl py-10 space-y-8">
      {/* Page title */}
      <Skeleton className="h-10 w-56" />

      {/* Form card */}
      <div className="rounded-xl border bg-card p-6 space-y-6">
        <FormFieldSkeleton labelWidth="w-20" />
        <FormFieldSkeleton labelWidth="w-28" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormFieldSkeleton labelWidth="w-20" />
          <FormFieldSkeleton labelWidth="w-24" />
        </div>
        <FormFieldSkeleton labelWidth="w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-40 w-full rounded-md" />
        </div>
        {/* Submit button */}
        <div className="flex justify-end gap-3 pt-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
