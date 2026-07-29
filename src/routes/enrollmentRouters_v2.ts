import { Router, type Request, type Response } from "express";

import {
  zEnrollmentBody,
} from "../libs/zodValidators.js";

import type { Enrollment  } from "../libs/types.js";

// import database
import { enrollments, DB } from "../db/db.js";
import { users, students, courses } from "../db/db.js";

// import middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import type { CustomRequest } from "../libs/types.ts";
import { checkRoles } from "../middlewares/checkRolesMiddleware.ts";
// import { checkRoleAdmin } from "../middlewares/checkRoleAdminMiddleware.ts";
// import { checkRoles } from "../middlewares/checkRolesMiddleware.ts";

const router = Router();


// GET /api/v2/enrollments
router.get('/',
    authenticateToken, 
    (req: Request, res: Response) =>{
    try{
        const user = (req as CustomRequest).user;
        if( user?.role === "ADMIN"){
            return res.status(200).json({
                ok: true,
                message: enrollments
            });
        }
        else if(user?.role === "STUDENT"){
            const Myenrollment = enrollments.filter((e) => e.studentId == user.studentId)
            return res.status(200).json({
                ok: true,
                message: Myenrollment
            });
        }
        // const courseNo = req.query.courseNo;
        // const studentId = req.query.studentId;

        // if(courseNo&&studentId){
        //     return res.json({
        //         ok: false,
        //         message: "Please provide either studentId or courseNo and not both!"
        //     })
        // } else if(courseNo){
        //     let filtered_studentId = enrollments.filter((e) => e.courseId===courseNo).map((e)=> e.studentId);
        //     let filtered_student = students.filter((s) => filtered_studentId.includes(s.studentId));
        //     return res.json({
        //         ok: true,
        //         students: filtered_student
        //     })

        // } else if(studentId){
        //     let filtered_courseId = enrollments.filter((c) => c.studentId===studentId).map((c)=> c.courseId);
        //     let filtered_course = courses.filter((c)=> filtered_courseId.includes(c.courseId));

        //     return res.json({
        //         ok: true,
        //         courses: filtered_course
        //     })
        // } else {
        //     return res.json({
        //         ok: false,
        //         message: "Please provide either studentId or courseNo and not both!"
        //     })
        // }

    } catch(err){
        return res.status(500).json({
            ok: false,
            message: "Somthing is wrong, please try again",
        });
    }
})

router.post("/",
    authenticateToken,
    (req:Request, res:Response) => {
        try{

            const user = (req as CustomRequest).user;
            const body = req.body as Enrollment;
            
            if( user?.role === "ADMIN"){
                return res.status(403).json({
                    ok: true,
                    message: "Only Student can access this API route"
                });
            }
            // validate req.body with predefined validator
            const result = zEnrollmentBody.safeParse(body); // check zod
            if (!result.success) {
            return res.json({
                message: "Validation failed",
                errors: result.error.issues[0]?.message,
            });
            }
    
            //same studentId with login mai
            const sameStudent = body.studentId === user?.studentId;
            if(!sameStudent){
                return res.json({
                    ok: true,
                    message: "Cannot enroll for others"
                })
            }
        
            //check does it already exist
            const found = DB.enrollments.find(
                (e) => e.studentId === body.studentId && e.courseId === body.courseId,
            );
            if (found) {
            return res.json({
                success: false,
                message: "Already enrolled",
            });
            }

            DB.enrollments.push({studentId:body.studentId, courseId:body.courseId});
            return res.json({
                success: true,
                message: "Enroll success",
                data: {studentId:body.studentId, courseId:body.courseId}
            });

        } catch (err) {
            return res.json({
                success: false,
                message: "Somthing is wrong, please try again",
                error: err,
            });
            }
});

// DELETE /api/v2/enrollments
router.delete('/', authenticateToken ,(req:Request, res:Response) => {
    try{
        const user = (req as CustomRequest).user;
        const { courseNo } = req.body ;

        if (user?.role === "ADMIN") {
            return res.status(403).json({
                ok: false,
                message: "Only Student can access this API route",
            });
        }

        const foundIndex = DB.enrollments.findIndex((e) => e.courseId === courseNo && e.studentId === user?.studentId);
        if(foundIndex===-1) //cannot find
        {
            return res.status(404).json({
                ok: false,
                message: "Enrollment does not exist"
            })
        }
    
        DB.enrollments.splice(foundIndex,1);
        
        return res.json({
            ok: true,
            message: "You has dropped from this course. See you next semester."
        });
    } catch(err){
        return res.status(500).json({
            success: false,
            message: "Somthing is wrong, please try again",
        });
    }
});

export default router;