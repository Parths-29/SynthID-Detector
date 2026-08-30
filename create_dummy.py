import cv2
import numpy as np
img = np.zeros((512, 512, 3), dtype=np.uint8)
cv2.imwrite("dummy.jpg", img)
