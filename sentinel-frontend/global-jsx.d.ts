import 'react';

declare global {
    namespace JSX {
        /* eslint-disable @typescript-eslint/no-empty-object-type */
        interface IntrinsicElements extends React.JSX.IntrinsicElements { }
        interface Element extends React.JSX.Element { }
        interface ElementClass extends React.JSX.ElementClass { }
        interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty { }
        interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute { }
        interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes { }
        interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> { }
        /* eslint-enable @typescript-eslint/no-empty-object-type */
    }
}
