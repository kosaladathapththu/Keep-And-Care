import AuthBoundary from '../../auth-context';
import Workspace from '../../workspace';
export default function NewJobPage(){return <AuthBoundary><Workspace initialPage="New job"/></AuthBoundary>}
