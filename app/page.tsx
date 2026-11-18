import AuthBoundary from './auth-context';
import Workspace from './workspace';
export default function Home(){return <AuthBoundary><Workspace/></AuthBoundary>}
