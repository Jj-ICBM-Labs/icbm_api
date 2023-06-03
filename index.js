const express = require('express');
var cors = require('cors')
const { connect, model, Schema } = require('mongoose');
const speakEasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const app = express();
const { algorithm, DB_URL, secret } = require('./config.json');

const studentInfoSchema = new Schema({
    duid: String,
    id: String,
    secret: String,
});

const studentInfo = model("studentInfo", studentInfoSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


app.post('/otp', async (req, res) => {
    const { id, token } = req.body;
    if (!id || !token) return res.json({ status: 0, message: "Body have not enough information" });
    const studentData = await studentInfo.findOne({ id: req.body.id });
    if (!studentData) return res.json({ status: 0, message: "Student is not found." });
    console.log(req.body);
    if (!studentData.secret) return res.json({ status: 0, message: "Student does not have a secret key." });
    var verified = speakEasy.totp.verify({
        secret: studentData.secret,
        encoding: 'base32',
        algorithm,
        token: req.body.token
    });

    try {
        if (!verified) return res.json({ status: 0, message: "Student not verified." });

        const token = await new Promise((resolve, reject) => {
            jwt.sign(
                {
                    memberId: studentData?.id
                },
                secret,
                {
                    expiresIn: "30m",
                },
                (err, token) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(token);
                    }
                }
            );
        });
        return res.json({ status: 1, message: "Student verified.", token });
    } catch (err) {
        console.log(err);
        return res.json({ status: 0, message: "Failed create token" });
    }
});

app.listen(8080, function () {
    console.log('CORS-enabled web server listening on port 8080')
});

connect(DB_URL).then(() => {
    console.log("Connected to MongoDB");
}).catch(e => console.log("Error connecting to MongoDB", e));
