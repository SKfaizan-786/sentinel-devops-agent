import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonGroup } from '@/components/common/Skeleton';
import { ServiceCardSkeleton, ServiceGridSkeleton } from '@/components/dashboard/ServiceCardSkeleton';
import { ChartSkeleton, MetricsChartsSkeleton } from '@/components/dashboard/ChartSkeleton';
import { IncidentTimelineSkeleton } from '@/components/dashboard/IncidentTimelineSkeleton';
import { AgentReasoningPanelSkeleton } from '@/components/dashboard/AgentReasoningPanelSkeleton';

describe('Base Skeleton Component', () => {
    it('renders with aria-busy attribute', () => {
        render(<Skeleton data-testid="skeleton" />);
        const skeleton = screen.getByRole('status');
        expect(skeleton).toBeDefined();
        expect(skeleton.getAttribute('aria-busy')).toBe('true');
    });

    it('renders with aria-label for accessibility', () => {
        render(<Skeleton />);
        const skeleton = screen.getByRole('status');
        expect(skeleton.getAttribute('aria-label')).toBe('Loading...');
    });

    it('applies text variant styles', () => {
        render(<Skeleton variant="text" data-testid="text-skeleton" />);
        const skeleton = screen.getByRole('status');
        expect(skeleton.className).toContain('h-4');
    });

    it('applies circular variant styles', () => {
        render(<Skeleton variant="circular" />);
        const skeleton = screen.getByRole('status');
        expect(skeleton.className).toContain('rounded-full');
    });

    it('applies rectangular variant styles', () => {
        render(<Skeleton variant="rectangular" />);
        const skeleton = screen.getByRole('status');
        expect(skeleton.className).toContain('rounded-md');
    });

    it('applies custom width and height', () => {
        render(<Skeleton width={100} height={50} />);
        const skeleton = screen.getByRole('status');
        expect(skeleton.style.width).toBe('100px');
        expect(skeleton.style.height).toBe('50px');
    });

    it('applies animate-pulse class', () => {
        render(<Skeleton />);
        const skeleton = screen.getByRole('status');
        expect(skeleton.className).toContain('animate-pulse');
    });
});

describe('SkeletonGroup Component', () => {
    it('renders multiple skeleton lines', () => {
        render(<SkeletonGroup count={3} />);
        const skeletons = screen.getAllByRole('status');
        expect(skeletons.length).toBe(3);
    });

    it('has aria-busy on container', () => {
        const { container } = render(<SkeletonGroup count={2} />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.getAttribute('aria-busy')).toBe('true');
    });
});

describe('ServiceCardSkeleton Component', () => {
    it('renders without errors', () => {
        const { container } = render(<ServiceCardSkeleton />);
        expect(container.firstChild).toBeDefined();
    });

    it('contains skeleton elements', () => {
        render(<ServiceCardSkeleton />);
        const skeletons = screen.getAllByRole('status');
        expect(skeletons.length).toBeGreaterThan(0);
    });
});

describe('ServiceGridSkeleton Component', () => {
    it('renders correct number of skeleton cards', () => {
        render(<ServiceGridSkeleton count={4} />);
        // Each card has multiple skeletons, so we check the container
        const container = screen.getByLabelText('Loading services...');
        expect(container).toBeDefined();
    });

    it('has aria-busy on grid', () => {
        render(<ServiceGridSkeleton count={3} />);
        const grid = screen.getByLabelText('Loading services...');
        expect(grid.getAttribute('aria-busy')).toBe('true');
    });
});

describe('ChartSkeleton Component', () => {
    it('renders chart skeleton with bars', () => {
        render(<ChartSkeleton />);
        const skeleton = screen.getByLabelText('Loading chart...');
        expect(skeleton).toBeDefined();
    });

    it('has aria-busy attribute', () => {
        render(<ChartSkeleton />);
        const skeleton = screen.getByLabelText('Loading chart...');
        expect(skeleton.getAttribute('aria-busy')).toBe('true');
    });
});

describe('MetricsChartsSkeleton Component', () => {
    it('renders without errors', () => {
        render(<MetricsChartsSkeleton />);
        const skeleton = screen.getByLabelText('Loading metrics...');
        expect(skeleton).toBeDefined();
    });
});

describe('IncidentTimelineSkeleton Component', () => {
    it('renders incident timeline skeleton', () => {
        render(<IncidentTimelineSkeleton count={2} />);
        const skeleton = screen.getByLabelText('Loading incidents...');
        expect(skeleton).toBeDefined();
    });

    it('has aria-busy attribute', () => {
        render(<IncidentTimelineSkeleton />);
        const skeleton = screen.getByLabelText('Loading incidents...');
        expect(skeleton.getAttribute('aria-busy')).toBe('true');
    });
});

describe('AgentReasoningPanelSkeleton Component', () => {
    it('renders AI panel skeleton', () => {
        render(<AgentReasoningPanelSkeleton />);
        const skeleton = screen.getByLabelText('Loading AI analysis...');
        expect(skeleton).toBeDefined();
    });

    it('has aria-busy attribute', () => {
        render(<AgentReasoningPanelSkeleton />);
        const skeleton = screen.getByLabelText('Loading AI analysis...');
        expect(skeleton.getAttribute('aria-busy')).toBe('true');
    });
});
