import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";

const SkeletonLine = ({ className }: { className: string }) => {
  return <div className={`bg-cax-surface-subtle rounded ${className}`}></div>;
};

export const PostPageSkeleton = () => {
  return (
    <>
      <article aria-hidden="true" className="px-1 sm:px-4">
        <div className="border-cax-border border-b px-4 pt-4 pb-4">
          <div className="flex items-center justify-center">
            <div className="shrink-0 grow-0 pr-2">
              <div className="bg-cax-surface-subtle h-14 w-14 rounded-full sm:h-16 sm:w-16"></div>
            </div>
            <div className="min-w-0 shrink grow space-y-2 overflow-hidden">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-4 w-24" />
            </div>
          </div>
          <div className="space-y-3 pt-2 sm:pt-4">
            <SkeletonLine className="h-6 w-5/6" />
            <SkeletonLine className="h-6 w-3/5" />
            <AspectRatioBox aspectHeight={9} aspectWidth={16}>
              <div className="border-cax-border bg-cax-surface-subtle h-full w-full rounded-lg border"></div>
            </AspectRatioBox>
            <SkeletonLine className="h-4 w-28" />
          </div>
        </div>
      </article>

      <div aria-hidden="true">
        {Array.from({ length: 3 }, (_, idx) => {
          return (
            <article key={idx} className="px-1 sm:px-4">
              <div className="border-cax-border flex border-b px-2 pt-2 pb-4 sm:px-4">
                <div className="shrink-0 grow-0 pr-2 sm:pr-4">
                  <div className="bg-cax-surface-subtle h-8 w-8 rounded-full sm:h-12 sm:w-12"></div>
                </div>
                <div className="min-w-0 shrink grow space-y-2 pt-1">
                  <SkeletonLine className="h-3 w-24" />
                  <SkeletonLine className="h-4 w-4/5" />
                  <SkeletonLine className="h-3 w-20" />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
};
