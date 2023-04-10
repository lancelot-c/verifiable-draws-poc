import axios from 'axios';

let url = '';
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    url = 'http://localhost:8080/api/';
} else {
    url = `${window.location.protocol}//${window.location.host}/api/`;
}

export default axios.create({
    baseURL: url, // backend URL
});
