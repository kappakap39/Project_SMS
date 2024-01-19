import prisma from '../lib/db';

//! ตรวจสอบ token และบันทึก log เมื่อหมดอายุ
const handleTokenExpiration = async (token: string, user: string) => {
    const tokenExists = await prisma.tokenUser.findFirst({
        where: {
            TokenValue: token,
        },
    });
    if (!tokenExists) {
        return console.log('None Token delete Login');
    }
    if (tokenExists.UserID) {
        // บันทึก LogOut โดยอัตโนมัติ
        await prisma.log_History.create({
            data: {
                UserID: user,
                TypeLogger: 'LogOut ExpirationTime',
            },
        });
        // หา token แล้วให้ทำการลบ
        await prisma.tokenUser.delete({
            where: {
                TokenID: tokenExists.TokenID,
            },
        });
    }
};

function generateOTP() {
    // สร้าง OTP 6 หลัก
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
}

function chunkArray(arr: any[], batchSize: number) {
    const result = [];
    for (let i = 0; i < arr.length; i += batchSize) {
        const batch = arr.slice(i, i + batchSize);
        result.push(batch);
    }
    return result;
}

const createEmailHtmlContent = (user: any, sms: any, message: string) => {
    return ` 
        <div style="background-color: #ffffff; color: #333333; font-family: 'Arial', sans-serif; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; padding-bottom: 20px;">
            <h2 style="color: #333333; margin: 0;">Sent Mail to ${user.Firstname} ${user.Lastname}</h2>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; padding-bottom: 0px;">
                <div style="flex-basis: 48%;">
                    <h4 style="top: 0.1; font-size: 16px;">Tel: ${user.Tel} or ${sms.Tel}</h4>
                    <h4 style="top: 0.1; font-size: 16px;">Option: ${sms.Option}</h4>
                </div>
                <div style="flex-basis: 48%;">
                    <h4 style="top: 0.1; font-size: 16px;">Contact: ${sms.Contact}</h4>
                    <h4 style="top: 0.1; font-size: 16px;">Result: ${sms.Option}</h4>
                </div>
                <div style="flex-basis: 48%; text-align: left;">
                    <h4 style="top: 0; font-size: 14px;">Description: ${sms.Description}</h4>
                </div>
            </div>
            <hr style="border: 1px solid #555; margin: 20px 0;">
            <div>
                <h3 style="margin: 0; font-size: 18px;">Message:</h3>
                <p style="font-size: 16px; line-height: 1.6;">${message}</p>
            </div>
        </div>
    `;
};

export { handleTokenExpiration, generateOTP, chunkArray, createEmailHtmlContent };
