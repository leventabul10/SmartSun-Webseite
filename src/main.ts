import './styles/index.css';
import { initEditSession } from './edit';
import { loadContent } from './content/loader';
import { startRouter } from './router';

await loadContent();
await initEditSession();
startRouter();
