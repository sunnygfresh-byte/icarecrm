import {handleCloudinary} from '../../../lib/pages-cloudinary.mjs';
export const onRequestPost=({request,env,params})=>handleCloudinary(request,env,params.action);
