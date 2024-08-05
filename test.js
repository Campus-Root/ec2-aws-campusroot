import axios from "axios";
import qs from "qs";
async function testAuth({ access_token }) {
    try {
        const profileResponse = await axios.get(`https://api.linkedin.com/v2/me`, {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        console.log({ profileResponse });
    } catch (error) {
        console.error(error);
        return { statusCode: 500, message: `profile response not granted, change code`, data: null };
    }

    try {
        const emailResponse = await axios.get(`https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))`, {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        console.log({ emailResponse });
    } catch (error) {
        console.error(error);
        return { statusCode: 500, message: `email response not granted, change code`, data: null };
    }
    return { statusCode: 200, message: `success`, data: { profileResponse, emailResponse } };
}

console.log(await testAuth({
    access_token: 'AQUCaZigTmTKDTIkyxS_muAxbyqQE_i2u0uFvtFT3q25NcI5QG-IPcvvu_ZrBKn2eBQLRzzMK_HEBAnBZvwk-1e7RVp3zrYuyjn7rAkqPfBHt7DMR-6WRfCoGQIPAjagjr25R2aWXET3ZmoSFmXG-Wrwx9HY2YkDVvO82RswbkFumxqkjjFsyrcFg4CaffhpjHciEYgYmLn2u5w2L062b6DyfnV1TdSOOH6AGDbD9YEwbZ_TluIGfH0OgYfZNgV9zqqVhvu6VtPl_Sg1AGW4umsVH4eC5yHNDubQlI7l7LsE7NfQIZH8ojwWgaT47hSqeL-6b4I-0AFm1OaWgjH0rAKfxGN41A',
}))


// {
//     accessToken: {
//         access_token: 'AQUCaZigTmTKDTIkyxS_muAxbyqQE_i2u0uFvtFT3q25NcI5QG-IPcvvu_ZrBKn2eBQLRzzMK_HEBAnBZvwk-1e7RVp3zrYuyjn7rAkqPfBHt7DMR-6WRfCoGQIPAjagjr25R2aWXET3ZmoSFmXG-Wrwx9HY2YkDVvO82RswbkFumxqkjjFsyrcFg4CaffhpjHciEYgYmLn2u5w2L062b6DyfnV1TdSOOH6AGDbD9YEwbZ_TluIGfH0OgYfZNgV9zqqVhvu6VtPl_Sg1AGW4umsVH4eC5yHNDubQlI7l7LsE7NfQIZH8ojwWgaT47hSqeL-6b4I-0AFm1OaWgjH0rAKfxGN41A',
//             expires_in: 5183999,
//                 scope: 'email,openid,profile',
//                     token_type: 'Bearer',
//                         id_token: 'eyJ6aXAiOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImQ5Mjk2NjhhLWJhYjEtNGM2OS05NTk4LTQzNzMxNDk3MjNmZiIsImFsZyI6IlJTMjU2In0.eyJpc3MiOiJodHRwczovL3d3dy5saW5rZWRpbi5jb20vb2F1dGgiLCJhdWQiOiI4NndxMXNhdm83aWlnaiIsImlhdCI6MTcyMjgwMjk3NSwiZXhwIjoxNzIyODA2NTc1LCJzdWIiOiJOckVwTlJOZDRvIiwibmFtZSI6IlZpc2hudSBUZWphIiwiZ2l2ZW5fbmFtZSI6IlZpc2hudSIsImZhbWlseV9uYW1lIjoiVGVqYSIsInBpY3R1cmUiOiJodHRwczovL21lZGlhLmxpY2RuLmNvbS9kbXMvaW1hZ2UvRDU2MDNBUUdIcVZaYkRoellDQS9wcm9maWxlLWRpc3BsYXlwaG90by1zaHJpbmtfMTAwXzEwMC8wLzE2NjE2ODE4NTIwMzA_ZT0yMTQ3NDgzNjQ3JnY9YmV0YSZ0PWkxYTRFSEZBYkFpeEdJanc2NmZUQk5KeGtMRnQ4ZmN5M3AtMVBlLW9qcEEiLCJlbWFpbCI6InZpc2hudS50ZWphMTAxLnZ0QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjoidHJ1ZSIsImxvY2FsZSI6ImVuX1VTIn0.OPZeCVl_tUznQDCzv9cVsH6uNlLyD83--sOKVnV-yIDIFWTv9Hb6Q93nA6qc6kpLBbiVSZsulLLaqXKNwnAXIJh7UEo-88AUfnP9C8-ajT585NKMptBv7g0TEZz6JWm1JVFRr8xZrx404IdjlYOsfu2zvLgcK_6r0bG7ggWS7WOrx_02QEUraMa-NgOwBmy9THwOOezlYbnI7EkEmMP3yvU7bCVFkd3TcVyCXWgw0L6FXSrmJPvZEFKH_2Mo1FiGCuKRThMoTN8uAmnPjWTJuC-hBbGUNwSMpWtGHOKCAHl0LIS6eSA7L243crseZJYx6LE3f63edbPOTZ6uh2YQJcu21-922hWCduzqWU0RcTRP-VeKprUbV9K0frXm5uzJqaqqzeHDJ1vjmaxrmGqvlbGZ-rqQb-rqnk7WI_qSr4K9TFMF-RTjbNjkri7E3_vycf7n2HiDxo3G7xL9KKRJNaLHjZDRq_8k9lkBHUHPmXqm5kg646dKXR5osDbmxzWuv7MH1SEOrrXjaMmXFb90dSBAPfPkgE97WCmuPUwQHSXr9vSLSyOWLgtYl4aWXTBvBgJZo13rt23aUvqBrE1T60MjrZV7zPiwSXCT_t0plwjiZssUARMA6quC32e5vZ7EvqD5VNJKHv1riDJqtm_g7NDn6I69Hbe_j5XoUEUkhvI'
//     }
// }

// {
//     "issuer": "https://www.linkedin.com/oauth",
//         "authorization_endpoint": "https://www.linkedin.com/oauth/v2/authorization",
//             "token_endpoint": "https://www.linkedin.com/oauth/v2/accessToken",
//                 "userinfo_endpoint": "https://api.linkedin.com/v2/userinfo",
//                     "jwks_uri": "https://www.linkedin.com/oauth/openid/jwks",
//                         "response_types_supported": [
//                             "code"
//                         ],
//                             "subject_types_supported": [
//                                 "pairwise"
//                             ],
//                                 "id_token_signing_alg_values_supported": [
//                                     "RS256"
//                                 ],
//                                     "scopes_supported": [
//                                         "openid",
//                                         "profile",
//                                         "email"
//                                     ],
//                                         "claims_supported": [
//                                             "iss",
//                                             "aud",
//                                             "iat",
//                                             "exp",
//                                             "sub",
//                                             "name",
//                                             "given_name",
//                                             "family_name",
//                                             "picture",
//                                             "email",
//                                             "email_verified",
//                                             "locale"
//                                         ]
// }


// await axios.get(`https://api.linkedin.com/v2/userinfo`, {
//     headers: { Authorization: `Bearer ${access_token}` },
// });
// {
//     statusCode: 200,
//     message: 'success',
//     data: {
//       data: {
//         sub: 'NrEpNRNd4o',
//         email_verified: true,
//         name: 'Vishnu Teja',
//         locale: [Object],
//         given_name: 'Vishnu',
//         family_name: 'Teja',
//         email: 'vishnu.teja101.vt@gmail.com',
//         picture: 'https://media.licdn.com/dms/image/D5603AQGHqVZbDhzYCA/profile-displayphoto-shrink_100_100/0/1661681852030?e=1728518400&v=beta&t=cHaYLrSoaqNNpdDQEDjBSEWM3OjIDFug_b2qj4dYB88'
//       }
//     }
//   }