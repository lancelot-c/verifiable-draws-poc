import http from 'src/http-common';

class DrawService {

    create(drawTitle, drawRules, drawParticipants, drawNbWinners, drawScheduledAt) {
        return http.post('/draw/create', {
            drawTitle,
            drawRules,
            drawParticipants,
            drawNbWinners,
            drawScheduledAt
        });
    }

    launch(cid) {
        return http.post('/draw/launch', {
            cid
        });
    }

}

export default new DrawService();
