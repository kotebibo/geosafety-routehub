'use client'

import { Button } from '@/components/ui-monday/Button'
import { StatusPill, getStatusLabel } from '@/components/ui-monday/StatusPill'

export default function DesignSystemTest() {
  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-h1 font-semibold text-text-primary">
            Monday.com Design System Test
          </h1>
          <p className="text-text-secondary">
            Testing the implementation of Monday.com design tokens and components
          </p>
        </div>

        {/* Typography Section */}
        <section className="space-y-6">
          <h2 className="text-h2 font-semibold text-text-primary border-b border-border-light pb-2">
            Typography
          </h2>
          <div className="space-y-4">
            <div>
              <h1 className="text-h1 font-semibold text-text-primary">
                Heading 1 - Figtree 32px
              </h1>
              <p className="text-text-secondary text-sm">32px, Semibold</p>
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-text-primary">
                Heading 2 - Figtree 28px
              </h2>
              <p className="text-text-secondary text-sm">28px, Semibold</p>
            </div>
            <div>
              <h3 className="text-h3 font-semibold text-text-primary">
                Heading 3 - Figtree 24px
              </h3>
              <p className="text-text-secondary text-sm">24px, Semibold</p>
            </div>
            <div>
              <p className="text-text-primary">Body text - Primary (14px)</p>
              <p className="text-text-secondary">Body text - Secondary (14px)</p>
              <p className="text-text-tertiary">Body text - Tertiary (14px)</p>
            </div>
            <div>
              <p className="font-brand text-lg">Brand Font - Poppins</p>
              <p className="font-georgian text-lg">Georgian Font - ქართული</p>
            </div>
          </div>
        </section>

        {/* Colors Section */}
        <section className="space-y-6">
          <h2 className="text-h2 font-semibold text-text-primary border-b border-border-light pb-2">
            Colors
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-20 bg-monday-primary rounded-lg shadow-monday-sm" />
              <p className="text-sm text-text-primary font-medium">Monday Primary</p>
              <p className="text-xs text-text-tertiary">#6161FF</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-status-done rounded-lg shadow-monday-sm" />
              <p className="text-sm text-text-primary font-medium">Done</p>
              <p className="text-xs text-text-tertiary">#00D748</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-status-working rounded-lg shadow-monday-sm" />
              <p className="text-sm text-text-primary font-medium">Working</p>
              <p className="text-xs text-text-tertiary">#FFCA00</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-status-stuck rounded-lg shadow-monday-sm" />
              <p className="text-sm text-text-primary font-medium">Stuck</p>
              <p className="text-xs text-text-tertiary">#FF3D57</p>
            </div>
          </div>
        </section>

        {/* Button Section */}
        <section className="space-y-6">
          <h2 className="text-h2 font-semibold text-text-primary border-b border-border-light pb-2">
            Buttons
          </h2>

          {/* Button Variants */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-secondary mb-3">Variants</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
              </div>
            </div>

            {/* Button Sizes */}
            <div>
              <p className="text-sm text-text-secondary mb-3">Sizes</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="xs">Extra Small</Button>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
              </div>
            </div>

            {/* Button States */}
            <div>
              <p className="text-sm text-text-secondary mb-3">States</p>
              <div className="flex flex-wrap gap-3">
                <Button>Normal</Button>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>

            {/* Button with Icons */}
            <div>
              <p className="text-sm text-text-secondary mb-3">With Icons</p>
              <div className="flex flex-wrap gap-3">
                <Button leftIcon={<span>←</span>}>Back</Button>
                <Button rightIcon={<span>→</span>}>Next</Button>
                <Button size="icon">+</Button>
              </div>
            </div>

            {/* Full Width */}
            <div>
              <p className="text-sm text-text-secondary mb-3">Full Width</p>
              <Button fullWidth>Full Width Button</Button>
            </div>
          </div>
        </section>

        {/* Status Pill Section */}
        <section className="space-y-6">
          <h2 className="text-h2 font-semibold text-text-primary border-b border-border-light pb-2">
            Status Pills
          </h2>

          {/* Monday.com Statuses */}
          <div>
            <p className="text-sm text-text-secondary mb-3">Monday.com Statuses</p>
            <div className="flex flex-wrap gap-3">
              <StatusPill status="done" label={getStatusLabel('done')} />
              <StatusPill status="working" label={getStatusLabel('working')} />
              <StatusPill status="stuck" label={getStatusLabel('stuck')} />
              <StatusPill status="default" label={getStatusLabel('default')} />
            </div>
          </div>

          {/* RouteHub Statuses */}
          <div>
            <p className="text-sm text-text-secondary mb-3">RouteHub Inspection Statuses</p>
            <div className="flex flex-wrap gap-3">
              <StatusPill status="enroute" label={getStatusLabel('enroute')} />
              <StatusPill status="arrived" label={getStatusLabel('arrived')} />
              <StatusPill status="inspecting" label={getStatusLabel('inspecting')} />
              <StatusPill status="delayed" label={getStatusLabel('delayed')} />
            </div>
          </div>

          {/* Route Statuses */}
          <div>
            <p className="text-sm text-text-secondary mb-3">Route Statuses</p>
            <div className="flex flex-wrap gap-3">
              <StatusPill status="not-started" label={getStatusLabel('not-started')} />
              <StatusPill status="planned" label={getStatusLabel('planned')} />
              <StatusPill status="active" label={getStatusLabel('active')} />
              <StatusPill status="completed" label={getStatusLabel('completed')} />
              <StatusPill status="cancelled" label={getStatusLabel('cancelled')} />
              <StatusPill status="paused" label={getStatusLabel('paused')} />
            </div>
          </div>

          {/* Status Pill Sizes */}
          <div>
            <p className="text-sm text-text-secondary mb-3">Sizes</p>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status="done" size="xs" label="XS" />
              <StatusPill status="done" size="sm" label="Small" />
              <StatusPill status="done" size="md" label="Medium" />
              <StatusPill status="done" size="lg" label="Large" />
            </div>
          </div>

          {/* Interactive Status Pills */}
          <div>
            <p className="text-sm text-text-secondary mb-3">Interactive (Click to interact)</p>
            <div className="flex flex-wrap gap-3">
              <StatusPill
                status="done"
                label="Done"
                interactive
                onStatusChange={(status) => console.log('Status clicked:', status)}
              />
              <StatusPill
                status="working"
                label="Working"
                interactive
                onStatusChange={(status) => console.log('Status clicked:', status)}
              />
              <StatusPill
                status="stuck"
                label="Stuck"
                interactive
                onStatusChange={(status) => console.log('Status clicked:', status)}
              />
            </div>
          </div>
        </section>

        {/* Backgrounds */}
        <section className="space-y-6">
          <h2 className="text-h2 font-semibold text-text-primary border-b border-border-light pb-2">
            Backgrounds & Spacing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-primary border border-border-light rounded-lg p-md">
              <p className="text-sm font-medium">Primary Background</p>
              <p className="text-xs text-text-tertiary mt-1">#FFFFFF</p>
            </div>
            <div className="bg-bg-secondary border border-border-light rounded-lg p-md">
              <p className="text-sm font-medium">Secondary Background</p>
              <p className="text-xs text-text-tertiary mt-1">#F7F7F7</p>
            </div>
            <div className="bg-bg-tertiary border border-border-light rounded-lg p-md">
              <p className="text-sm font-medium">Tertiary Background</p>
              <p className="text-xs text-text-tertiary mt-1">#EBEBEB</p>
            </div>
          </div>
        </section>

        {/* Shadows */}
        <section className="space-y-6">
          <h2 className="text-h2 font-semibold text-text-primary border-b border-border-light pb-2">
            Shadows
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-bg-primary rounded-lg p-6 shadow-monday-xs border border-border-light">
              <p className="text-sm font-medium">XS</p>
            </div>
            <div className="bg-bg-primary rounded-lg p-6 shadow-monday-sm border border-border-light">
              <p className="text-sm font-medium">SM</p>
            </div>
            <div className="bg-bg-primary rounded-lg p-6 shadow-monday-md border border-border-light">
              <p className="text-sm font-medium">MD</p>
            </div>
            <div className="bg-bg-primary rounded-lg p-6 shadow-monday-lg border border-border-light">
              <p className="text-sm font-medium">LG</p>
            </div>
            <div className="bg-bg-primary rounded-lg p-6 shadow-monday-xl border border-border-light">
              <p className="text-sm font-medium">XL</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
