const { sendNotification } = require('../services/fcmService');
const token = 'eQvAgdp6jU2Hkt6OH9-ywv:APA91bHhQBTkJ0I3ftCdrVTM_M5EFjgrPmnFwLorSyy21ycmrZ8wSL2t_YIyShN072jFPfOQ8yT1_SSlo56B39Ts6bc386RT1pTBM_mdBB3W_YOmpi4U6ks';
sendNotification(token, { title: 'Test Admin', body: 'This is a test notification.' }).then(console.log).catch(console.error);
